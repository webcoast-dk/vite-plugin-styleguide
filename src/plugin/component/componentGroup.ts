import type { ComponentRecord, ComponentRecordInterface } from './componentRecord'

interface ComponentGroupInterface {
    identifier: string
    label: string
    components: ComponentRecordInterface[]
    groups: ComponentGroupInterface[],
    sorting: number
}

class ComponentGroup {
    identifier: string
    label: string
    components: ComponentRecord[]
    groups: ComponentGroup[]
    sorting?: number

    constructor(
        identifier: string,
        label: string,
        sorting: number = 0,
        components: ComponentRecord[] = [],
        groups: ComponentGroup[] = []
    ) {
        this.identifier = identifier
        this.label = label
        this.sorting = sorting
        this.components = components
        this.groups = groups
    }

    getIdentifier(): string {
        return this.identifier
    }

    getLabel(): string {
        return this.label
    }

    getComponents(): ComponentRecord[] {
        return this.components
    }

    getGroups(): ComponentGroup[] {
        return this.groups
    }

    addGroup(group: ComponentGroup): void {
        this.groups.push(group)
    }

    addComponent(component: ComponentRecord): void {
        this.components.push(component)
    }

    setSorting(sorting: number): void {
        this.sorting = sorting
    }

    getSorting(): number|undefined {
        return this.sorting
    }
}

export { ComponentGroup, ComponentGroupInterface }
