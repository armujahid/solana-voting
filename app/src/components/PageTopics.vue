<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { fetchTweets, topicFilter } from "@/api";
import { useSlug, useFromRoute } from "@/composables";
import TweetForm from "@/components/TweetForm";
import TweetList from "@/components/TweetList";
import TweetSearch from "@/components/TweetSearch";

// Data.
const router = useRouter();
const tweets = ref([]);
const loading = ref(true);
const topic = ref("");
const slugTopic = useSlug(topic);
const viewedTopic = ref("");

// Actions.
const search = () => {
  router.push(`/topics/${slugTopic.value}`);
};

//fileters tweets by topic
const fetchTopicTweets = async () => {
  if (slugTopic.value === viewedTopic.value) return;
  try {
    loading.value = true;
    const fetchedTweets = await fetchTweets([topicFilter(slugTopic.value)]);
    tweets.value = fetchedTweets;
    viewedTopic.value = slugTopic.value;
  } finally {
    loading.value = false;
  }
};

const addTweet = (tweet) => tweets.value.push(tweet);

// Router hooks.
useFromRoute((route) => {
  topic.value = route.params.topic;
  if (topic.value) {
    fetchTopicTweets();
  } else {
    tweets.value = [];
    viewedTopic.value = "";
  }
});
</script>

<template>
  <tweet-search
    placeholder="topic"
    :disabled="!slugTopic"
    :modelValue="slugTopic"
    @update:modelValue="(value) => (topic = value)"
    @search="search"
  >
    <template #icon>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z"
          clip-rule="evenodd"
        />
      </svg>
    </template>
  </tweet-search>
  <div v-if="viewedTopic">
    <tweet-form @added="addTweet" :forced-topic="viewedTopic"></tweet-form>
    <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
    <div v-if="tweets.length === 0" class="p-8 text-gray-500 text-center">
      No tweets were found in this topic...
    </div>
  </div>
</template>
