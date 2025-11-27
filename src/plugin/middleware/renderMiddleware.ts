import path from 'path'
import { ComponentRenderer } from '../component/componentRenderer.js'
import { NextHandleFunction } from 'connect'
import type { NunjucksOptions } from '../../../types/plugin'

export function renderMiddleware(componentsBasePath: string, nunjucksOptions: NunjucksOptions|undefined): NextHandleFunction {
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

        try {
            const componentRendered = new ComponentRenderer(path.join(process.cwd(), componentsBasePath), nunjucksOptions)
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(componentRendered.renderPreview(componentIdentifier, variantIdentifier))
        } catch (e) {
            console.error(`Error rendering component ${componentIdentifier + (variantIdentifier != '' ? `--${variantIdentifier}` : '')}:`, e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain');
            res.end(e instanceof Error ? e.message : `Error rendering component ${componentIdentifier + (variantIdentifier != '' ? `--${variantIdentifier}` : '')}`);
        }
    }
}
