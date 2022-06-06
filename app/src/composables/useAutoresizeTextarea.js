import { watchEffect } from "vue"

export const useAutoresizeTextarea = (element) => {
    const resizeTextarea = () => {
        element.value.style.height = 'auto'
        element.value.style.height = element.value.scrollHeight + 'px'
    }

    watchEffect(onInvalidate => {
        if (! element.value) return
        resizeTextarea()
        element.value.addEventListener('input', resizeTextarea)
        onInvalidate(() => element.value?.removeEventListener('input', resizeTextarea))
    })
}
