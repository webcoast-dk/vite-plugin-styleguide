interface ComponentVariantRecordInterface {
    identifier: string
    label: string
    defaultHandle: string
    customHandle?: string
    templateFile?: string
}

interface ComponentRecordInterface {
    identifier: string
    label: string
    defaultHandle: string
    customHandle?: string
    templateFile: string
    variants: ComponentVariantRecordInterface[]
    sorting: number
}

class ComponentVariantRecord {
    private identifier: string
    private label: string
    private defaultHandle: string
    private customHandle?: string
    private templateFile?: string
    private context?: {}

    constructor(
        identifier: string,
        label: string,
        defaultHandle: string,
        customHandle?: string,
        templateFile?: string,
        context?: {}
    ) {
        this.identifier = identifier
        this.label = label
        this.defaultHandle = defaultHandle
        this.customHandle = customHandle
        this.templateFile = templateFile
        this.context = context
    }

    getIdentifier(): string {
        return this.identifier
    }

    getLabel(): string {
        return this.label
    }

    getDefaultHandle(): string {
        return this.defaultHandle
    }

    getCustomHandle(): string | undefined {
        return this.customHandle
    }

    getTemplateFile(): string | undefined {
        return this.templateFile
    }

    getContext(): {} | undefined {
        return this.context
    }
}

class ComponentRecord {
    private identifier: string
    private label: string
    private defaultHandle: string
    private customHandle?: string
    private templateFile: string
    private variants: ComponentVariantRecord[]
    private sorting?: number
    private context?: {}
    private layout?: string

    constructor(
        identifier: string,
        label: string,
        templateFile: string,
        defaultHandle: string,
        customHandle?: string,
        variants: ComponentVariantRecord[] = [],
        context?: {},
        layout?: string,
    ) {
        this.identifier = identifier
        this.label = label
        this.templateFile = templateFile
        this.defaultHandle = defaultHandle
        this.customHandle = customHandle
        this.variants = variants
        this.context = context
        this.layout = layout
    }


    getIdentifier(): string {
        return this.identifier
    }

    getLabel(): string {
        return this.label
    }

    getDefaultHandle(): string {
        return this.defaultHandle
    }

    getCustomHandle(): string|undefined {
        return this.customHandle
    }

    getTemplateFile(): string {
        return this.templateFile
    }

    getVariants(): ComponentVariantRecord[] {
        return this.variants
    }

    setSorting(sorting: number): void {
        this.sorting = sorting
    }

    getSorting(): number|undefined {
        return this.sorting
    }

    getContext(): {} | undefined {
        return this.context
    }

    getLayout(): string | undefined {
        return this.layout
    }
}

export { ComponentRecord, ComponentVariantRecord, ComponentRecordInterface, ComponentVariantRecordInterface }
