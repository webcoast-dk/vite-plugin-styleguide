import type nunjucks from 'nunjucks'

export type ExtensionConstructor = new (...args: any[]) => nunjucks.Extension;

export interface NunjucksOptions {
    extensions?: { [key: string]: nunjucks.Extension | ExtensionConstructor },
    filters?: { [key: string]: (...args: any[]) => any },
    globals?: { [key: string]: any }
}

export interface PluginOptions {
    componentsBasePath: string,
    nunjucks?: NunjucksOptions
}
