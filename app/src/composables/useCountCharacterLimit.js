import { ref, watchEffect } from "vue"

export const useCountCharacterLimit = (text, limit) => {
    const characterLimit = ref(0)
    watchEffect(() => characterLimit.value = limit - text.value?.length)

    return characterLimit
}
