<script lang="ts">
import { defineComponent, ref } from 'vue';
import ComponentList from './ComponentList.vue';
import type { ComponentTree } from '../../../types/component'
import ComponentPreview from './ComponentPreview.vue'

export default defineComponent({
    name: 'App',
    components: {
        ComponentPreview,
        ComponentList
    },
    data() {
        return {
            components: {} as ComponentTree,
            loading: true,
            iframeSrc: 'about:blank',
            _hmrWebSocket: null as WebSocket | null
        };
    },
    async mounted() {
        this.fetchComponents()
        this.connectHMR()
    },
    beforeUnmount(): any {
        this._hmrWebSocket?.close()
    },
    provide() {
        return {
            loadComponent: this.loadComponent
        }
    },
    methods: {
        async fetchComponents() {
            const res = await fetch('/api/components');
            this.components = await res.json();
            this.loading = false;
        },
        async connectHMR() {
            return fetch('/api/websocket/token').then(async res => {
                const { token } = await res.json();
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const hmrUrl = `${protocol}//${host}/?token=${token}`;
                try {
                    this._hmrWebSocket = new WebSocket(hmrUrl, 'vite-hmr');

                    this._hmrWebSocket.addEventListener('message', ev => {
                        const data = JSON.parse(ev.data)
                        if (data.type === 'custom' && ['styleguide:component-added', 'styleguide:component-removed'].includes(data.event)) {
                            this.fetchComponents();
                        }
                    });

                    this._hmrWebSocket.addEventListener('close', () => {
                        console.info('[vite styleguide] Lost connection to server. Polling for restart...');
                        setTimeout(() => {
                            this.connectHMR();
                        }, 1000);
                    });
                } catch (e) {
                    // Just retry in a second
                    setTimeout(() => {
                        this.connectHMR();
                    }, 1000);
                }
            }).catch(() => {
                // Just retry in a second
                setTimeout(() => {
                    this.connectHMR();
                }, 1000);
            })
        },
        loadComponent(url: string) {
            this.iframeSrc = url;
        }
    }
})
</script>

<template>
    <div class="header">
        <h1 class="title">Component Styleguide</h1>
    </div>
    <template v-if="loading">
        <p class="loading">Loading components…</p>
    </template>
    <template v-else>
        <nav class="menu">
            <ComponentList :components="components"/>
        </nav>
        <main>
            <RouterView/>
        </main>
    </template>
</template>

<style lang="scss">
.header {
    grid-column: 1/-1;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    background-color: var(--header-bg-color, #f8f9fa);
}

.title {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0.5rem 0 0.5rem 1rem;
}

.loading {
    grid-column: 1/-1;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
}

.menu {
    padding: 1rem;
    position: relative;
}

main {
    position: relative;
    background-color: #ffffff;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
        pointer-events: none;
    }
}
</style>
