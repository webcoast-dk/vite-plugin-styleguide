// vite.config.app.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'src/app'),
    base: './',
    build: {
        outDir: path.resolve(__dirname, 'dist/app'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/app/index.html'),
        }
    },
    plugins: [vue()]
});
