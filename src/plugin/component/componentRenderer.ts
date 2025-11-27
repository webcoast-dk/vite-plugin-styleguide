import nunjucks from 'nunjucks'
import fs from 'fs'
import path from 'path'
import merge from 'lodash.merge'
import { RenderExtension } from '../nunjucks/renderExtension.js'
import type { NunjucksOptions } from '../../../types/plugin'
import { ComponentCollector } from './componentCollector.js'

export class ComponentRenderer {
    private componentRootPath: string
    private nunjucks: nunjucks.Environment
    private componentCollector: ComponentCollector

    constructor(templatePath: string, nunjucksOptions: NunjucksOptions = {}) {
        this.componentRootPath = templatePath
        this.componentCollector = new ComponentCollector(this.componentRootPath)
        this.nunjucks = new nunjucks.Environment(new nunjucks.FileSystemLoader([templatePath]), {
            autoescape: true,
            noCache: true
        })
        this.nunjucks.addGlobal('componentRenderer', this)
        this.nunjucks.addExtension('render', new RenderExtension(this.componentRootPath))

        if (nunjucksOptions.globals !== undefined) {
            for (const name in nunjucksOptions.globals) {
                this.nunjucks.addGlobal(name, nunjucksOptions.globals[name])
            }
        }

        if (nunjucksOptions.extensions !== undefined) {
            for (const name in nunjucksOptions.extensions) {
                const extension = nunjucksOptions.extensions[name]
                if (typeof extension === 'function') {
                    // If it's a constructor, instantiate it
                    this.nunjucks.addExtension(name, new extension())
                } else {
                    // Otherwise, assume it's already an instance
                    this.nunjucks.addExtension(name, extension)

                }
            }
        }

        if (nunjucksOptions.filters !== undefined) {
            for (const name in nunjucksOptions.filters) {
                this.nunjucks.addFilter(name, nunjucksOptions.filters[name], nunjucksOptions.filters[name].constructor.name === 'AsyncFunction')
            }
        }
    }

    render(componentIdentifier: string, variantIdentifier: string | null = null, contextOverride: {} = {}, mergeWithDefaultContext: boolean = true): string {
        const componentConfiguration = this.componentCollector.getComponentByHandle(componentIdentifier)
        if (!componentConfiguration) {
            throw new Error(`No component found with identifier '${componentIdentifier}'`)
        }

        let templateFileToRender = componentConfiguration.getTemplateFile()

        let context = mergeWithDefaultContext ? merge({}, componentConfiguration.getContext() || {}) : {}
        if (variantIdentifier && componentConfiguration.getVariants()) {
            const variant = componentConfiguration.getVariants().find(v => v.getIdentifier() === variantIdentifier)
            if (variant && variant.getContext()) {
                context = merge(context, variant.getContext())
            }
            if (variant && variant.getTemplateFile()) {
                templateFileToRender = variant.getTemplateFile()!
            }
        }

        if (!fs.existsSync(path.join(this.componentRootPath, templateFileToRender))) {
            throw new Error(`Template file "${templateFileToRender}" for component "${componentIdentifier}" does not exist.`)
        }
        if (Object.keys(contextOverride).length > 0) {
            context = merge(context, contextOverride)
        }

        try {
            return this.nunjucks.render(templateFileToRender, context)
        } catch (e: any) {
            if (e.message && e.message.length > 0) {
                return `<pre style="color: red;">Error rendering component "${componentIdentifier}":\n${e.message}</pre>`
            }

            return `<pre style="color: red;">Error rendering component "${componentIdentifier}".</pre>`
        }
    }

    renderPreview(componentIdentifier: string, variantIdentifier: string | null = null, contextOverride: {} = {}, mergeWithDefaultContext: boolean = true): string {
        const componentConfiguration = this.componentCollector.getComponentByHandle(componentIdentifier)

        if (!componentConfiguration) {
            throw new Error(`No component found with identifier '${componentIdentifier}'`)
        }

        const renderedComponent = this.render(componentIdentifier, variantIdentifier, contextOverride, mergeWithDefaultContext)

        if (componentConfiguration.getLayout() !== undefined && componentConfiguration.getLayout() !== '') {
            let layoutFilePath = ''
            if (componentConfiguration.getLayout()?.startsWith('/')) {
                // If the layout is absolute, make it relative to component root path
                layoutFilePath = path.join(this.componentRootPath, componentConfiguration.getLayout()!.replace(/^/, ''))
            } else if (!componentConfiguration.getLayout()?.includes('/')) {
                // If the layout is just a filename, try to find a matching file upwards in the directory tree
                let currentDir = path.join(this.componentRootPath, path.dirname(componentConfiguration.getTemplateFile()))
                let layoutFile = componentConfiguration.getLayout()
                if (layoutFile) {
                    if (!layoutFile.endsWith('.njk')) {
                        layoutFile += '.njk'
                    }
                    if (!layoutFile.startsWith('_')) {
                        layoutFile = '_' + layoutFile
                    }

                    while (this.componentCollector.isPathInsideComponentRoot(currentDir)) {
                        const possibleLayoutPath = path.join(currentDir, layoutFile)
                        if (fs.existsSync(possibleLayoutPath) && fs.statSync(possibleLayoutPath).isFile()) {
                            layoutFilePath = possibleLayoutPath
                            break
                        }
                        currentDir = path.dirname(currentDir)
                    }
                }
            } else {
                // Otherwise, assume it's relative to the component directory
                const componentDir = path.dirname(path.join(this.componentRootPath, componentIdentifier))
                layoutFilePath = path.join(componentDir, componentConfiguration.getLayout()!)
            }

            if (layoutFilePath === '') {
                console.warn(`Layout file for layout "${componentConfiguration.getLayout()}" not found. Ignoring layout`)

                return renderedComponent
            }

            if (!layoutFilePath.endsWith('.njk')) {
                // Make sure the layout file has .njk extension
                layoutFilePath += '.njk'
            }

            if (!path.basename(layoutFilePath).startsWith('_')) {
                // Make sure the layout file is private (starts with _)
                layoutFilePath = path.join(path.dirname(layoutFilePath), '_' + path.basename(layoutFilePath))
            }

            if (!fs.existsSync(layoutFilePath)) {
                console.warn(`Layout file ${path.relative(this.componentRootPath, layoutFilePath)} does not exist. Ignoring layout`)

                return renderedComponent
            }

            let context = mergeWithDefaultContext ? componentConfiguration.getContext() || {} : {}
            if (variantIdentifier && componentConfiguration.getVariants()) {
                const variant = componentConfiguration.getVariants().find(v => v.getIdentifier() === variantIdentifier)
                if (variant && variant.getContext()) {
                    context = merge(context, variant.getContext())
                }
            }
            if (Object.keys(contextOverride).length > 0) {
                context = merge(context, contextOverride)
            }

            try {
                return this.nunjucks.render(path.relative(this.componentRootPath, layoutFilePath), {
                    _content: renderedComponent,
                    _config: componentConfiguration,
                    _target: {
                        context: context
                    }
                })
            } catch (e: any) {
                if (e.message && e.message.length > 0) {
                    return `<pre style="color: red;">Error rendering layout "${componentConfiguration.getLayout()}" for component "${componentIdentifier}":\n${e.message}</pre>`
                }

                return `<pre style="color: red;">Error rendering layout "${componentConfiguration.getLayout()}" for component "${componentIdentifier}".</pre>`
            }
        }

        return renderedComponent
    }
}
