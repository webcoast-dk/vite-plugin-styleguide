<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import type { ComponentConfig, ComponentTree } from '../../../types/component';

export default defineComponent({
    name: 'ComponentList',
    props: {
        components: {
            type: Object as PropType<ComponentTree>,
            required: true,
        }
    },
    inject: ['loadComponent'],
    methods: {
        isLeaf(entry: ComponentTree|ComponentConfig): boolean {
            return entry.children === undefined && entry.variants.length === 0
        },
        openComponent(ev: MouseEvent) {
            const link = ev.currentTarget as HTMLAnchorElement;
            // this.loadComponent(link.href)
        }
    },
});
</script>

<template>
    <ul class="component-list">
        <li v-for="(value, key) in components" :key="key" class="component-list__item" :class="{ 'is-group': !isLeaf(value) }">
            <RouterLink :to="{ name: 'component', params: { pathMatch: value.url.split('/')}}" v-if="isLeaf(value)" class="component-list__link" target="component-viewer" @click.prevent="openComponent">{{ value.label }}</RouterLink>
            <template v-else-if="value.variants !== undefined && value.variants.length > 1">
                <h3 class="component-list__header">{{ value.label }}</h3>
                <ul class="component-list">
                    <li v-for="variant in value.variants" :key="variant.name" class="component-list__item">
                        <RouterLink :to="{ name: 'component', params: { pathMatch: variant.url.split('/')}}" class="component-list__link" target="component-viewer" @click.prevent="openComponent">{{ variant.label }}</RouterLink>
                    </li>
                </ul>
            </template>
            <template v-else>
                <h3 class="component-list__header">{{ value.label }}</h3>
                <ComponentList :components="value.children as ComponentTree" />
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

        &.is-group {
            & + & {
                margin-top: 2rem;
            }
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
