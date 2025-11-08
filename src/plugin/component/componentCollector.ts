import type { ComponentConfig, ComponentTree } from '../../../types/component'
import fs from 'fs'
import path from 'path'

class ComponentCollector {
    private basePath: string;

    private componentsTree: Record<string, ComponentTree | ComponentConfig> = {}

    private handles: { [key: string]: string } = {}

    constructor(private componentsBasePath: string) {
        this.basePath = componentsBasePath
        this.componentsTree = this.findComponents(componentsBasePath)
        this.handles = this.buildHandles(this.componentsTree)
    }

    getLabel(identifier: string): string {
        // Strip numeric prefix
        identifier = identifier.replace(/^\d+-/, '')
        // Convert kebab-case to Title Case
        identifier = identifier.replace(/-/g, ' ')

        return identifier.substring(0, 1).toUpperCase() + identifier.substring(1)
    }

    findComponents(directory: string): Record<string, ComponentTree | ComponentConfig> {
        const result = {} as Record<string, ComponentTree | ComponentConfig>;
        for (const entry of fs.readdirSync(directory)) {
            const fullPath = path.join(directory, entry);
            const relPath = path.relative(this.basePath, fullPath);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                const identifier = entry;
                // Find possible `{identifier}.config.json` file
                const configPath = path.join(directory, entry, `${identifier}.config.json`);
                let config = {} as ComponentConfig;
                if (fs.existsSync(configPath)) {
                    try {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    } catch (e) {
                        console.error(`Error reading config for ${identifier}:`, e);
                    }
                }
                result[entry] = {
                    identifier: identifier,
                    label: config.label || this.getLabel(identifier),
                    children: this.findComponents(fullPath)
                };

                if (Object.keys(result[entry].children).length === 0) {
                    // If the directory is empty, we don't include it in the result
                    delete result[entry];
                } else if (Object.keys(result[entry].children).length === 1 && result[entry].children[Object.keys(result[entry].children)[0]]?.identifier.replace(/\d+-/, '') === path.basename(fullPath).replace(/\d+-/, '')) {
                    // If the directory has only one item, and it matches the path, we flatten it
                    const singleItemKey = Object.keys(result[entry].children)[0];
                    result[entry] = result[entry].children[singleItemKey];
                }
            } else if (entry.endsWith('.njk') && !entry.startsWith('_')) {
                let identifier = entry.replace(/\.njk$/, '');

                // Skip variants and private files (starting with `_`)
                if (identifier.match(/--/g) || identifier.match(/^_.+/)) {
                    continue
                }
                // Find possible `{identifier}.config.json` file
                const configPath = path.join(directory, `${identifier}.config.json`);
                let config = {} as ComponentConfig;
                if (fs.existsSync(configPath)) {
                    try {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    } catch (e) {
                        console.error(`Error reading config for ${identifier}:`, e);
                    }
                }

                const variants = config.variants || []
                for (const variant of variants) {
                    variant.url = path.dirname(relPath).replace(/\\/g, '/') + '/' + identifier + '--' + variant.identifier
                }

                // Scan current directory for variants
                for (const file of fs.readdirSync(directory)) {
                    if (file.match(/--(.+)\.njk$/)) {
                        const variantIdentifier = file.replace(/^.+--(.+)\.njk$/, '$1');
                        variants.push({
                            identifier: variantIdentifier,
                            label: this.getLabel(variantIdentifier),
                            url: path.dirname(relPath).replace(/\\/g, '/') + '/' + identifier + '--' + variantIdentifier
                        })
                    }
                }

                if (variants.length > 0 && variants[0].identifier !== 'default') {
                    variants.unshift({
                        identifier: 'default',
                        label: config.label || this.getLabel('default'),
                        url: path.dirname(relPath).replace(/\\/g, '/') + '/' + identifier + '--' + 'default'
                    })
                }

                result[identifier] = {
                    identifier: identifier,
                    label: config.label || this.getLabel(identifier),
                    variants: variants,
                    path: `/${relPath}`.replace(/\\/g, '/'),
                    url: path.dirname(relPath).replace(/\\/g, '/') + '/' + identifier
                }
            }
        }
        return result
    }

    buildHandles(componentsTree: Record<string, ComponentTree | ComponentConfig>, parentPath: string = ''): { [key: string]: string } {
        const handles: { [key: string]: string } = {}

        // Stack entries hold a mapping (record) and its base path
        const stack: Array<{ tree: Record<string, ComponentTree | ComponentConfig>, basePath: string }> = [
            { tree: componentsTree, basePath: parentPath }
        ]

        while (stack.length) {
            const { tree, basePath } = stack.pop()!
            for (const key in tree) {
                const component = tree[key]
                let currentPath = basePath ? `${basePath}/${key}` : key

                console.log('Processing component:', component.identifier, 'at path:', currentPath)

                if ('children' in component) {
                    // Defer traversal of children
                    stack.push({tree: component.children, basePath: currentPath})
                } else {
                    if (component.variants.length > 0) {
                        for (const variant of component.variants) {
                            let variantHandle = ''
                            if (variant.identifier === 'default') {
                                variantHandle = `${currentPath}/${component.identifier}`
                                currentPath = `${currentPath}/${component.identifier}`
                            } else {
                                variantHandle = `${currentPath}/${component.identifier}--${variant.identifier}`
                                currentPath = `${currentPath}/${component.identifier}--${variant.identifier}`
                            }
                            if (/(?:^|\/)\d+-/.test(variantHandle)) {
                                variantHandle = variantHandle.replace(/(^|\/)\d+-/g, '$1')
                            }
                            handles[variantHandle] = currentPath
                        }
                    } else {
                        let handle = currentPath
                        if (/(?:^|\/)\d+-/.test(handle)) {
                            handle = handle.replace(/(^|\/)\d+-/g, '$1')
                        }
                        handles[handle] = currentPath
                    }

                }
            }
        }

        return handles
    }

    getComponentsTree(): Record<string, ComponentTree | ComponentConfig> {
        return this.componentsTree;
    }

    getIdentifierByHandle(handle: string): string | undefined {
        return this.handles[handle] || undefined;
    }
}

export { ComponentCollector }
