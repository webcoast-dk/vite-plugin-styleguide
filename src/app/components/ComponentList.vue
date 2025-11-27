<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import type { ComponentGroupInterface } from '../../plugin/component/componentGroup.js'
import type { ComponentRecordInterface } from '../../plugin/component/componentRecord.js'

export default defineComponent({
    name: 'ComponentList',
    props: {
        group: {
            type: Object as PropType<ComponentGroupInterface>,
            required: true,
        }
    },
    inject: ['loadComponent'],
    computed: {
        sortedComponents(): Array<{type: string, value: ComponentGroupInterface|ComponentRecordInterface}> {
            const components: Array<{type: string, value: ComponentGroupInterface|ComponentRecordInterface}> = [];
            for (const group of this.group.groups) {
                components.push({ type: 'group', value: group });
            }
            for (const component of this.group.components) {
                components.push({ type: 'component', value: component });
            }
            components.sort((a, b) => a.value.sorting > b.value.sorting ? 1 : a.value.sorting < b.value.sorting ? -1 : 0);
            return components;
        }
    }
});
</script>

<template>
    <ul class="component-list">
        <li v-for="(value, key) in sortedComponents" :key="key" class="component-list__item" :class="{'is-group': value.type === 'group' || (value.value as ComponentRecordInterface).variants.length > 0 }">
            <RouterLink :to="{ name: 'component', params: { pathMatch: value.value.identifier.split('/')}}" v-if="value.type === 'component' && (value.value as ComponentRecordInterface).variants.length === 0" class="component-list__link" target="component-viewer">{{ value.value.label }}</RouterLink>
            <template v-else-if="value.type === 'component' && (value.value as ComponentRecordInterface).variants.length > 0">
                <h3 class="component-list__header">{{ value.value.label }}</h3>
                <ul class="component-list">
                    <li v-for="variant in (value.value as ComponentRecordInterface).variants" :key="variant.identifier" class="component-list__item">
                        <RouterLink :to="{ name: 'component', params: { pathMatch:  (value.value.identifier + (variant.identifier === 'default' ? '' : `--${variant.identifier}`)).split('/') }}" class="component-list__link" target="component-viewer">{{ variant.label }}</RouterLink>
                    </li>
                </ul>
            </template>
            <template v-else>
                <h3 class="component-list__header">{{ value.value.label }}</h3>
                <ComponentList :group="value.value as ComponentGroupInterface" />
            </template>
        </li>
    </ul>
</template>


<style lang="scss">
.component-list {
    list-style: none;
    padding: 0;
    margin: 0;

    &__header {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
    }

    &__item {
        margin: 0;
        position: relative;

        & + &.is-group {
            margin-top: 1rem;
        }

        &.is-group + &.is-group {
            margin-top: 2rem;
        }

        &.is-group:has(+ &:not(.is-group)) > .component-list {
            margin-bottom: 0.5rem;
        }
    }

    &__link {
        display: block;
        padding: 0.5rem 0;
        margin: -0.5rem 0;
        text-decoration: none;
        color: var(--sidebar-link-color, #333333);
    }

    & & {
        margin: 1rem 0 0 1rem;
    }
}
</style>
