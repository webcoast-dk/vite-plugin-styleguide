import path from 'path'
import fs from 'fs'
import { ComponentRenderer } from '../component/componentRenderer.js'
import { NextHandleFunction } from 'connect'

export function renderMiddleware(componentsBasePath: string): NextHandleFunction {
    return (req, res, next) => {
        const match = req.url?.match(/^\/(?<componentIdentifier>.+)$/)
        let componentIdentifier: string = ''
        let variantIdentifier: string = ''
        if (match) {
            if (match.groups?.componentIdentifier.includes('--')) {
                [componentIdentifier, variantIdentifier] = match.groups.componentIdentifier.split('--')
            } else {
                componentIdentifier = match.groups?.componentIdentifier || ''
            }
        }
        // First try with full variant file path
        let pathToRender = path.join(process.cwd(), componentsBasePath, componentIdentifier + '--' + variantIdentifier) + '.njk';
        let componentPathToRender = componentIdentifier + '--' + variantIdentifier
        if (!fs.existsSync(pathToRender) || !fs.statSync(pathToRender).isFile()) {
            // Fall back to component file path
            pathToRender = path.join(process.cwd(), componentsBasePath, componentIdentifier) + '.njk'
            componentPathToRender = componentIdentifier
        }

        if (fs.existsSync(pathToRender) && fs.statSync(pathToRender).isFile()) {
            try {
                const componentRendered = new ComponentRenderer(path.join(process.cwd(), componentsBasePath))
                res.statusCode = 200
                res.setHeader('Content-Type', 'text/html')
                res.end(componentRendered.renderPreview(componentPathToRender, variantIdentifier))
            } catch (e) {
                console.error(`Error rendering component ${componentPathToRender}:`, e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end(e instanceof Error ? e.message : `Error rendering component ${componentPathToRender}`);
            }
        } else {
            next(); // Let Vite handle it
        }
    }
}
