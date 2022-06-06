<script setup>
import { ref, watchEffect } from "vue";
import { fetchTweets, authorFilter } from "@/api";
import TweetForm from "@/components/TweetForm";
import TweetList from "@/components/TweetList";
import { useWorkspace } from "@/composables";

const tweets = ref([]);
const loading = ref(true);
const { wallet } = useWorkspace();

watchEffect(() => {
  if (!wallet.value) return;
  fetchTweets([authorFilter(wallet.value.publicKey.toBase58())])
    .then((fetchedTweets) => (tweets.value = fetchedTweets))
    .finally(() => (loading.value = false));
});
const addTweet = (tweet) => tweets.value.push(tweet);
</script>

<template>
  <div v-if="true" class="border-b px-8 py-4 bg-gray-50">
    {{ wallet.publicKey.toBase58() }}
  </div>
  <tweet-form @added="addTweet"></tweet-form>
  <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
</template>
