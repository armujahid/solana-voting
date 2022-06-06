<script setup>
import { ref } from 'vue'
import { fetchTweets } from '@/api'
import TweetForm from '@/components/TweetForm'
import TweetList from '@/components/TweetList'

const tweets = ref([])
const loading = ref(true)
fetchTweets()
    .then(fetchedTweets => tweets.value = fetchedTweets)
    .finally(() => loading.value = false)

const addTweet = tweet => tweets.value.push(tweet)
</script>

<template>
    <tweet-form @added="addTweet"></tweet-form>
    <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
</template>
