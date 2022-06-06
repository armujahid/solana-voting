import { computed } from 'vue'

export const useSlug = text => {
    return computed(() => {
        return (text.value || '')
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
    })
}
