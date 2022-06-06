import { onBeforeRouteUpdate, useRoute } from 'vue-router'

export const useFromRoute = (fn) => {
    fn(useRoute(), null)
    onBeforeRouteUpdate((to, from, next) => {
        fn(to, from)
        next()
    })
}
