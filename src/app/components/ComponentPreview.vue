<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: "ComponentPreview",
    props: {
        component: {
            type: [String, Array],
            required: false
        }
    },
    data() {
        return {
            iframe: {
                width: null as number | null,
                height: null as number | null,
            },
            resize: {
                start: {
                    width: null as number | null,
                    height: null as number | null,
                    x: 0,
                    y: 0
                }
            }
        }
    },
    computed: {
        normalizedComponent(): string | null {
            if (Array.isArray(this.component)) {
                return this.component.join('/');
            } else if (typeof this.component === 'string') {
                return this.component;
            }
            return null;
        },
        iframeSrc(): string {
            return this.component ? `/render/${this.normalizedComponent}` : 'about:blank';
        },
        isResizing(): boolean {
            return this.resize.start.x > 0 || this.resize.start.y > 0;
        }
    },
    methods: {
        resizeStart(event: MouseEvent) {
            if (event.currentTarget instanceof HTMLElement) {
                const iframe = this.$refs.componentViewer as HTMLIFrameElement;
                const direction = event.currentTarget.dataset.direction;
                if (direction === 'horizontal') {
                    this.resize.start.width = iframe.getBoundingClientRect().width;
                    this.resize.start.x = event.clientX;
                } else if (direction === 'vertical') {
                    this.resize.start.height = iframe.getBoundingClientRect().height;
                    this.resize.start.y = event.clientY;
                }

                window.addEventListener('mousemove', this.resizeMove);
                window.addEventListener('mouseup', this.resizeEnd);
            }
        },
        resizeMove(event: MouseEvent) {
            if (this.resize.start.x > 0) {
                const deltaX = this.resize.start.x - event.clientX;
                this.iframe.width = Math.max(320, (this.resize.start.width || 0) - deltaX);
            } else if (this.resize.start.y > 0) {
                const deltaY = this.resize.start.y - event.clientY;
                this.iframe.height = Math.max(320, (this.resize.start.height || 0) - deltaY);
            }
        },
        resizeEnd() {
            window.removeEventListener('mousemove', this.resizeMove);
            this.resize.start = { width: null, height: null, x: 0, y: 0 };
        }
    },
})
</script>

<template>
    <div class="component-preview">
        <div class="component-wrapper" :style="`width: ${iframe.width === null ? '100%' : `${iframe.width}px`}; height: ${iframe.height === null ? '100%' : `${iframe.height}px`};`">
            <div class="component-viewer" :class="{'is-resizing': isResizing}">
                <iframe id="component-viewer" :src="iframeSrc" ref="componentViewer"></iframe>
            </div>
            <div class="component-resizer component-resizer--horizontal" data-direction="horizontal" @mousedown="resizeStart" @dblclick="iframe.width = null"></div>
            <div class="component-resizer component-resizer--vertical" data-direction="vertical" @mousedown="resizeStart" @dblclick="iframe.height = null"></div>
        </div>
    </div>
</template>

<style lang="scss">
.component-preview {
    width: 100%;
    height: 100%;
    background-color: #cccccc;
    overflow: hidden;
}

.component-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    border-right: 10px solid #ffffff;
    border-bottom: 10px solid #ffffff;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
        pointer-events: none; /* Prevents the pseudo-element from blocking interactions */
    }
}

.component-resizer {
    position: absolute;
    height: 30px;
    width: 30px;
    z-index: 1;
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
    align-items: center;
    gap: 2px;
    user-select: none;

    &::before,
    &::after {
        content: '';
        width: 2px;
        height: 100%;
        border-radius: 30px;
        background-color: #666;
    }

    &--horizontal {
        top: 50%;
        right: -20px;
        translate: 0 -50%;
        cursor: ew-resize;
    }

    &--vertical {
        left: 50%;
        bottom: -20px;
        translate: -50% 0;
        rotate: 90deg;
        cursor: ns-resize;
    }
}

.component-viewer {
    width: 100%;
    height: 100%;

    &.is-resizing {
        pointer-events: none;
        opacity: 0.7;

        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 10px, transparent 10px, transparent 20px);
            background-position: top left;
            background-repeat: repeat;
            background-size: calc(sqrt(2) * 20px) calc(sqrt(2) * 20px);
            pointer-events: none;
        }
    }

    iframe {
        width: 100%;
        height: 100%;
        border: none;
    }
}
</style>
