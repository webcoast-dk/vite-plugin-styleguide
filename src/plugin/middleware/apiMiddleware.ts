import { NextHandleFunction } from 'connect'
import fs from 'fs'
import path from 'path'
import { ComponentCollector } from '../component/componentCollector.js'

export function apiMiddleware(componentsBasePath: string): NextHandleFunction {

    return async (req, res, next) => {
        if (!fs.existsSync(path.resolve(process.cwd(), componentsBasePath))) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
            return;
        }

        const componentCollector = new ComponentCollector(path.resolve(process.cwd(), componentsBasePath))
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(componentCollector.getComponentsTree()));
    }
}
