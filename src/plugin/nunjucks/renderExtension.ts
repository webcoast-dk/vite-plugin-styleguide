import { ComponentCollector } from '../component/componentCollector.js'
import nunjucks from 'nunjucks'
import { ComponentRenderer } from '../component/componentRenderer'


class RenderExtension {
    private componentCollector: ComponentCollector
    constructor(componentRootPath: string) {
        this.componentCollector = new ComponentCollector(componentRootPath)
    }

    tags = ['render'];

    parse(parser: any, nodes: any) {
        const token = parser.nextToken();
        const tagArguments = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(token.value);

        return new nodes.CallExtension(this, 'run', tagArguments);
    }

    run(context: any, componentHandle: string, contextOverride: {} = {}, mergeWithDefaultContext: boolean = true) {
        let variantIdentifier: string = ''
        if (componentHandle.includes('--')) {
            variantIdentifier = componentHandle.split('--')[1];
        }

        const componentIdentifier = this.componentCollector.getIdentifierByHandle(componentHandle.replace(/^@/, ''))
        if (!componentIdentifier) {
            throw new Error(`No component found with handle '${componentHandle}'`)
        }
        const renderer = context.env.globals.componentRenderer as ComponentRenderer;
        return new nunjucks.runtime.SafeString(renderer.render(componentIdentifier, variantIdentifier, contextOverride, mergeWithDefaultContext));
    }
}

export { RenderExtension };
