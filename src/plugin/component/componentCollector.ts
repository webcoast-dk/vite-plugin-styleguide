import type { ComponentConfig, ComponentTree } from '../../../types/component'
import fs from 'fs'
import path from 'path'
import merge from 'lodash.merge'
import { ComponentRecord, ComponentVariantRecord } from './componentRecord.js'
import { ComponentGroup } from './componentGroup.js'

class ComponentCollector {
    private basePath: string

    private componentsTree: ComponentGroup

    private handles: { [key: string]: ComponentRecord } = {}

    constructor(componentsBasePath: string) {
        this.basePath = componentsBasePath
        this.componentsTree = this.findComponents(componentsBasePath)
        this.handles = this.buildHandles()
    }

    getLabel(identifier: string): string {
        // Strip numeric prefix
        identifier = identifier.replace(/^\d+-/, '')
        // Convert kebab-case to Title Case
        identifier = identifier.replace(/-/g, ' ')

        return identifier.substring(0, 1).toUpperCase() + identifier.substring(1)
    }

    findComponents(directory: string): ComponentGroup {
        const root = new ComponentGroup('components', 'Components')
        const stack = [{ directory, group: root }] as Array<{ directory: string, group?: ComponentGroup }>

        while (stack.length) {
            const { directory, group: parentGroup } = stack.pop()!

            let sortingValue = 0
            for (const entry of fs.readdirSync(directory)) {
                const fullPath = path.join(directory, entry)
                if (fs.statSync(fullPath).isDirectory()) {
                    // Check if the directory contains a component file
                    const mainComponentFile = path.join(fullPath, entry.replace(/^\d+-/, '') + '.njk')
                    if (fs.existsSync(mainComponentFile)) {
                        const component = this.createComponentEntry(mainComponentFile)
                        component.setSorting(sortingValue)
                        parentGroup?.addComponent(component)
                    } else {
                        const componentGroup = new ComponentGroup(
                            entry.replace(/^\d+-/, ''),
                            this.getLabel(entry.replace(/^\d+-/, '')),
                            sortingValue
                        )
                        parentGroup?.addGroup(componentGroup)
                        stack.push({ directory: fullPath, group: componentGroup })
                    }
                    sortingValue++
                } else if (
                    fs.statSync(fullPath).isFile() // Is a file
                    && entry.endsWith('.njk') // Is a Nunjucks template
                    && !entry.startsWith('_') // Is not a private file
                    && !entry.includes('--') // Is not a variant file
                    && path.basename(directory).replace(/^\d+-/, '') !== entry.replace(/^\d+-/, '').replace(/\.njk$/, '') // Is not inside a same-named directory =>
                ) {
                    const component = this.createComponentEntry(fullPath)
                    component.setSorting(sortingValue)
                    parentGroup?.addComponent(component)
                    sortingValue++
                }
            }
        }

        const cleanupStack = [{ group: root }] as Array<{ group: ComponentGroup, parent?: ComponentGroup }>
        while (cleanupStack.length) {
            const { group, parent } = cleanupStack.pop()!
            if (group.getGroups().length === 0 && group.getComponents().length === 0 && parent) {
                // Remove empty group
                parent.getGroups().splice(parent.getGroups().indexOf(group), 1)
            } else {
                for (const subGroup of group.getGroups()) {
                    cleanupStack.push({ group: subGroup, parent: group })
                }
            }
        }

        return root
    }

    createComponentEntry(filePath: string): ComponentRecord {
        const config = this.resolveComponentConfiguration(path.relative(this.basePath, filePath.replace(/\.njk$/, '')))
        let defaultComponentHandle: string
        if (path.basename(path.dirname(filePath)).replace(/^\d+-/, '') === path.basename(filePath).replace(/\.njk$/, '')) {
            // If the component file is in a directory with the same name, use the directory as base for the handle
            defaultComponentHandle = path.relative(this.basePath, path.dirname(filePath)).replace(/\d+-/, '')
        } else {
            // Otherwise, use the full path including the file name as base for the handle
            defaultComponentHandle = path.relative(this.basePath, filePath).replace(/\.njk$/, '').replace(/(^|\/)\d+-/g, '$1')
        }
        const customComponentHandle = config.handle || undefined
        const variants: ComponentVariantRecord[] = []

        for (const variantConfig of config.variants || []) {
            const defaultVariantHandle = defaultComponentHandle + (variantConfig.identifier !== 'default' ? `--${variantConfig.identifier}` : '')
            const customVariantHandle = config.handle ? config.handle + (variantConfig.identifier !== 'default' ? `--${variantConfig.identifier}` : '') : undefined
            let variantTemplateFile: string | null = path.join(path.dirname(filePath), path.basename(filePath).replace(/\.njk$/, '') + `--${variantConfig.identifier}.njk`)
            if (!fs.existsSync(variantTemplateFile)) {
                variantTemplateFile = null
            } else {
                variantTemplateFile = path.relative(this.basePath, variantTemplateFile)
            }

            variants.push(new ComponentVariantRecord(
                variantConfig.identifier,
                variantConfig.label || this.getLabel(variantConfig.identifier),
                defaultVariantHandle,
                customVariantHandle,
                variantTemplateFile || undefined,
                variantConfig.context || undefined
            ))
        }
        // For variant files that exist but are not defined in config, we add them automatically
        const componentDir = path.dirname(filePath)
        for (const file of fs.readdirSync(componentDir)) {
            if (file.startsWith(path.basename(defaultComponentHandle)) && file.endsWith('.njk') && file.includes('--')) {
                const variantIdentifier = file.replace(new RegExp(`^${path.basename(filePath).replace(/\.njk$/, '')}--(.+)\\.njk$`), '$1')
                if (!variants.find(v => v.getIdentifier() === variantIdentifier)) {
                    const defaultVariantHandle = defaultComponentHandle + (variantIdentifier !== 'default' ? `--${variantIdentifier}` : '')
                    const customVariantHandle = config.handle ? config.handle + (variantIdentifier !== 'default' ? `--${variantIdentifier}` : '') : undefined

                    variants.push(new ComponentVariantRecord(
                        variantIdentifier,
                        this.getLabel(variantIdentifier),
                        defaultVariantHandle,
                        customVariantHandle,
                        path.relative(this.basePath, path.join(componentDir, file))
                    ))
                }
            }
        }

        // Ensure default variant is first, if variants exist
        if (variants.length > 0 && !variants.find(v => v.getIdentifier() === 'default')) {
            variants.unshift(new ComponentVariantRecord(
                'default',
                config.label || this.getLabel('default'),
                defaultComponentHandle,
                customComponentHandle,
                undefined
            ))
        }

        return new ComponentRecord(
            defaultComponentHandle,
            config.label || this.getLabel(path.basename(defaultComponentHandle)),
            path.relative(this.basePath, filePath),
            defaultComponentHandle,
            customComponentHandle,
            variants,
            config.context,
            config.layout
        )
    }

    buildHandles(): { [key: string]: ComponentRecord } {
        const handles: { [key: string]: ComponentRecord } = {}

        // Stack entries hold a mapping (record) and its base path
        const stack: Array<{ tree: ComponentGroup}> = [{ tree: this.componentsTree }]

        while (stack.length) {
            const { tree} = stack.pop()!
            for (const group of tree.getGroups()) {
                stack.push({ tree: group })
            }
            for (const component of tree.getComponents()) {
                handles[component.getDefaultHandle()] = component
                if (component.getCustomHandle()) {
                    handles[component.getCustomHandle()!] = component
                }
            }
        }

        return handles
    }

    getComponentsTree(): ComponentGroup {
        return this.componentsTree
    }

    getIdentifierByHandle(handle: string): string | undefined {
        return this.handles[handle].getIdentifier() || undefined
    }

    getComponentByHandle(handle: string): ComponentRecord | undefined {
        return this.handles[handle] || undefined
    }

    resolveComponentConfiguration(templateName: string): ComponentConfig {
        let componentPath = this.basePath + '/' + templateName

        let mergedConfig = {} as ComponentConfig

        // Try to find a config file named after the component in the same directory as the component file
        const configDir = path.dirname(componentPath)
        let configFile = path.basename(componentPath).replace(/^\d+-/, '') + '.config.json'
        if (fs.existsSync(path.join(configDir, configFile))) {
            const config = this.loadConfig(path.join(configDir, configFile))
            mergedConfig = merge(mergedConfig, config)
        }

        // Find and merge config files, that match the directory they are placed in
        while (this.isPathInsideComponentRoot(path.dirname(componentPath))) {
            const configDir = path.dirname(componentPath)

            let configFile = path.basename(configDir).replace(/^\d+-/, '') + '.config.json'
            if (configFile.match(/^\d+-/)) {
                // Remove numeric prefix from config file name
                configFile = configFile.replace(/^\d+-/, '')
            }

            // Try to determine the correct config directory
            if (fs.existsSync(path.join(configDir, configFile))) {
                const config = this.loadConfig(path.join(configDir, configFile))
                mergedConfig = merge(config, mergedConfig)
            }

            // Move one level up
            componentPath = path.dirname(componentPath)
        }

        return mergedConfig
    }

    loadConfig(configFile: string): ComponentConfig {
        try {
            return JSON.parse(fs.readFileSync(configFile).toString())
        } catch (e) {
            console.error(`Error reading config file ${configFile}:`, e)

            return {} as ComponentConfig
        }
    }


    isPathInsideComponentRoot(currentPath: string): boolean {
        const relative = path.relative(path.resolve(this.basePath), path.resolve(currentPath))
        return !relative.startsWith('..') && !path.isAbsolute(relative)
    }
}

export { ComponentCollector }
