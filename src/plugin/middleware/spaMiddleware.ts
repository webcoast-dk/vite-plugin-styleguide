import path from 'path'
import fs from 'fs'
import type { NextHandleFunction } from 'connect'

export function spaMiddleware(documentRoot: string): NextHandleFunction {
    return (req, res, next) => {
        const accept = req.headers.accept || '';
        if (accept.includes('text/html')) {
            const indexPath = path.join(documentRoot, 'index.html');
            if (fs.existsSync(indexPath)) {
                let html = fs.readFileSync(indexPath, 'utf-8')
                const match = req.url?.match(/^(.*?)\/components(\/.*)$/);
                let baseHref = match ? `${match[1].replace(/^\/(.*)\/?$/, '$1')}` : '';
                if (baseHref === '') {
                    baseHref = '/'
                }
                html = html.replace('%BASE_TAG%', `<base href="${baseHref}">`);
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
                return;
            }
        }
        next();
    }
}
