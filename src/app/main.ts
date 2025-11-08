import './base/typography.scss'
import './base/scaffolding.scss'

import { createApp } from 'vue';
import { createRouter, createWebHistory, type RouteRecordInfo } from 'vue-router'
import App from './components/App.vue';
import Index from './components/Index.vue';
import ComponentPreview from './components/ComponentPreview.vue'

const routes = [
    {
        path: '/',
        name: 'index',
        component: Index,
    },
    {
        path: '/components/:pathMatch(.*)*',
        name: 'component',
        component: ComponentPreview,
        props: (route: RouteRecordInfo) => ({component: route.params.pathMatch})
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

createApp(App).use(router).mount('#app');
