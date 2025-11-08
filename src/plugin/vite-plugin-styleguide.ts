import { Plugin } from 'vite'
import express from 'express'
import * as path from 'path';
import type { PluginOptions } from '../../types/plugin'
import type { NextHandleFunction } from 'connect'
import { spaMiddleware } from './middleware/spaMiddleware.js'
import { apiMiddleware } from './middleware/apiMiddleware.js'
import { renderMiddleware } from './middleware/renderMiddleware.js'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function styleguidePlugin(options: PluginOptions): Plugin {
    const distDir = path.resolve(__dirname, '../../dist/app')

    return {
        name: 'vite-plugin-styleguide',
        configureServer(server) {
            // Serve API with component structure
            server.middlewares.use('/api/components', apiMiddleware(options.componentsBasePath) );

            server.middlewares.use('/api/websocket', (req, res) => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                    token: server.config.webSocketToken
                }));
            })

            server.middlewares.use('/render/', renderMiddleware(options.componentsBasePath));

            server.middlewares.use('/', spaMiddleware(distDir));

            // Serve static files (JS, CSS, assets)
            const staticMiddleware = express.static(distDir)
            server.middlewares.use(staticMiddleware as NextHandleFunction)

            // SPA fallback: serve index.html for all other routes
            server.middlewares.use(spaMiddleware(distDir));

            // Configure watcher to watch for changes in the components directory
            server.watcher.add(path.join(options.componentsBasePath, '**', '*.njk'))
            server.watcher.on('add', filePath => {
                console.log(`Component added: ${filePath}`)
                if (filePath.endsWith('.njk') && !path.relative(path.join(process.cwd(), options.componentsBasePath), filePath).startsWith('..')) {
                    server.ws.send({
                        type: 'custom',
                        event: 'styleguide:component-added',
                        data: {
                            path: path.relative(path.join(process.cwd(), options.componentsBasePath), filePath)
                        }
                    })
                }
            })
            server.watcher.on('unlink', filePath => {
                console.log(`Component removed: ${filePath}`)
                if (filePath.endsWith('.njk') && !path.relative(path.join(process.cwd(), options.componentsBasePath), filePath).startsWith('..')) {
                    server.ws.send({
                        type: 'custom',
                        event: 'styleguide:component-removed',
                        data: {
                            path: path.relative(filePath, path.join(process.cwd(), options.componentsBasePath))
                        }
                    })
                }
            })
            server.watcher.on('change', (filePath) => {
                if (filePath.endsWith('.njk') && !path.relative(path.join(process.cwd(), options.componentsBasePath), filePath).startsWith('..')) {
                    server.ws.send({
                        type: 'full-reload',
                        path: filePath
                    })
                }
            })
        },
    };
}
