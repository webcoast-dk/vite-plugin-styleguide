export interface ComponentTree {
    identifier: string
    children: Record<string, ComponentTree | ComponentConfig>
}

export interface VariantConfig {
    identifier: string
    label: string
    url: string
    context?: {}
}

export interface ComponentConfig {
    identifier: string
    path: string
    url: string
    label: string
    layout?: string
    context?: {}
    variants: VariantConfig[]
}
