import nunjucks from 'nunjucks';
import fs from 'fs';
import path from 'path'
import merge from 'lodash.merge';
import type { ComponentConfig } from '../../../types/component'
import { RenderExtension } from '../nunjucks/renderExtension.js'

export class ComponentRenderer {
    private componentRootPath: string;
    private nunjucks: nunjucks.Environment;

    constructor(templatePath: string) {
        this.componentRootPath = templatePath;
        this.nunjucks = new nunjucks.Environment(new nunjucks.FileSystemLoader([templatePath]), {
            autoescape: true,
            noCache: true
        });
        this.nunjucks.addGlobal('componentRenderer', this);
        this.nunjucks.addExtension('render', new RenderExtension(this.componentRootPath))
    }

    render(componentIdentifier: string, variantIdentifier: string|null = null, contextOverride: {} = {}, mergeWithDefaultContext: boolean = true): string {
        const componentConfiguration = this.resolveComponentConfiguration(componentIdentifier);

        let context = mergeWithDefaultContext ? componentConfiguration.context || {} : {};
        if (variantIdentifier && componentConfiguration.variants) {
            const variant = componentConfiguration.variants.find(v => v.identifier === variantIdentifier);
            if (variant && variant.context) {
                context = merge(context, variant.context);
            }
        }
        if (Object.keys(contextOverride).length > 0) {
            context = merge(context, contextOverride);
        }

        return this.nunjucks.render(path.join(this.componentRootPath, componentIdentifier + '.njk'), context)
    }
    renderPreview(componentIdentifier: string, variantIdentifier: string|null = null, contextOverride: {} = {}, mergeWithDefaultContext: boolean = true): string {
        const componentConfiguration = this.resolveComponentConfiguration(componentIdentifier);

        const renderedComponent = this.render(componentIdentifier, variantIdentifier, contextOverride, mergeWithDefaultContext);

        if (componentConfiguration.layout !== undefined && componentConfiguration.layout !== '') {
            let layoutFilePath = '';
            if (componentConfiguration.layout.startsWith('/')) {
                // If the layout is absolute, make it relative to component root path
                layoutFilePath = path.join(this.componentRootPath, componentConfiguration.layout.replace(/^/, ''));
            } else if (!componentConfiguration.layout.includes('/')) {
                // If the layout is just a filename, try to find a matching file upwards in the directory tree
                let currentDir = path.join(this.componentRootPath, componentIdentifier)
                let layoutFile = componentConfiguration.layout
                if (!layoutFile.endsWith('.njk')) {
                    layoutFile += '.njk';
                }
                if (!layoutFile.startsWith('_')) {
                    layoutFile = '_' + layoutFile;
                }

                while (this.isPathInsideComponentRoot(currentDir)) {
                    const possibleLayoutPath = path.join(currentDir, layoutFile);
                    if (fs.existsSync(possibleLayoutPath) && fs.statSync(possibleLayoutPath).isFile()) {
                        layoutFilePath = possibleLayoutPath;
                        break;
                    }
                    currentDir = path.dirname(currentDir);
                }
            } else {
                // Otherwise, assume it's relative to the component directory
                const componentDir = path.dirname(path.join(this.componentRootPath, componentIdentifier));
                layoutFilePath = path.join(componentDir, componentConfiguration.layout);
            }

            if (layoutFilePath === '') {
                console.warn(`Layout file for layout "${componentConfiguration.layout}" not found. Ignoring layout`);

                return renderedComponent;
            }

            if (!layoutFilePath.endsWith('.njk')) {
                // Make sure the layout file has .njk extension
                layoutFilePath += '.njk';
            }

            if (!path.basename(layoutFilePath).startsWith('_')) {
                // Make sure the layout file is private (starts with _)
                layoutFilePath = path.join(path.dirname(layoutFilePath), '_' + path.basename(layoutFilePath));
            }

            if (!fs.existsSync(layoutFilePath)) {
                console.warn(`Layout file ${path.relative(this.componentRootPath, layoutFilePath)} does not exist. Ignoring layout`);

                return renderedComponent;
            }

            let context = mergeWithDefaultContext ? componentConfiguration.context || {} : {};
            if (variantIdentifier && componentConfiguration.variants) {
                const variant = componentConfiguration.variants.find(v => v.identifier === variantIdentifier);
                if (variant && variant.context) {
                    context = merge(context, variant.context);
                }
            }
            if (Object.keys(contextOverride).length > 0) {
                context = merge(context, contextOverride);
            }

            return this.nunjucks.render(path.relative(this.componentRootPath, layoutFilePath), {
                _content: renderedComponent,
                _config: componentConfiguration,
                _target: {
                    context: context
                }
            });
        }

        return renderedComponent;
    }

    resolveComponentConfiguration(templateName: string): ComponentConfig {
        let componentPath = this.componentRootPath + '/' + templateName;

        let mergedConfig = {} as ComponentConfig;

        while (this.isPathInsideComponentRoot(componentPath)) {
            const configDir = path.join(path.dirname(componentPath), path.basename(componentPath));
            let configFile = path.basename(componentPath) + '.config.json';
            if (configFile.match(/^\d+-/)) {
                // Remove numeric prefix from config file name
                configFile = configFile.replace(/^\d+-/, '');
            }
            const configPath = path.join(configDir, configFile);

            // Load the configuration from the current directory
            let config = this.loadConfig(configPath)

            // Merge the loaded configuration with the existing configuration, while giving the existing configuration having the highest priority
            mergedConfig = merge(config, mergedConfig)

            // Move one level up
            componentPath = path.dirname(componentPath)
        }

        return mergedConfig;
    }

    loadConfig(configFile: string): ComponentConfig {
        if (!fs.existsSync(configFile)) {
            return {} as ComponentConfig
        }

        try {
            const config = JSON.parse(fs.readFileSync(configFile).toString())
            if (config.layout !== undefined) {
                let layout = config.layout as string;
                if (path.isAbsolute(layout)) {
                    // Remove the leading slash
                    layout = layout.substring(1)
                } else {
                    // Interpret as relative to current config file dir and make it relative to component root path
                    layout = path.relative(this.componentRootPath, path.join(path.dirname(configFile), layout))
                }
                config.layout = layout
            }

            return config
        } catch (e) {
            console.error(`Error reading config file ${configFile}:`, e);

            return {} as ComponentConfig;
        }
    }


    isPathInsideComponentRoot(currentPath: string): boolean {
        const relative = path.relative(path.resolve(this.componentRootPath), path.resolve(currentPath));
        return !relative.startsWith('..') && !path.isAbsolute(relative);
    }
}
