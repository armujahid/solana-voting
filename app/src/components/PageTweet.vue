<script setup>
import { ref, watchEffect } from 'vue'
import { PublicKey } from '@solana/web3.js'
import { getTweet } from '@/api'
import { useFromRoute } from '@/composables'
import TweetCard from '@/components/TweetCard'

const tweetAddress = ref(null)
useFromRoute((route) => tweetAddress.value = route.params.tweet)

const loading = ref(false)
const tweet = ref(null)
watchEffect(async () => {
    try {
        loading.value = true
        tweet.value = await getTweet(new PublicKey(tweetAddress.value))
    } catch (e) {
        tweet.value = null
    } finally {
        loading.value = false
    }
})

</script>

<template>
    <div v-if="loading" class="p-8 text-gray-500 text-center">
        Loading...
    </div>
    <div v-else-if="! tweet" class="p-8 text-gray-500 text-center">
        Tweet not found
    </div>
    <tweet-card v-else :tweet="tweet"></tweet-card>
</template>
