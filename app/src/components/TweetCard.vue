<script setup>
import { toRefs, computed } from "vue";
import { useWorkspace } from "@/composables";

const props = defineProps({
  tweet: Object,
});

const { tweet } = toRefs(props);
const { wallet } = useWorkspace();

const authorRoute = computed(() => {
  if (
    wallet.value &&
    wallet.value.publicKey.toBase58() === tweet.value.author.toBase58()
  ) {
    return { name: "Profile" };
  } else {
    return { name: "Users", params: { author: tweet.value.author.toBase58() } };
  }
});
</script>

<template>
  <div class="px-8 py-4">
    <div>
      <h3 class="inline font-semibold" :title="tweet.author">
        <router-link :to="authorRoute" class="hover:underline">
          {{ tweet.author_display }}
        </router-link>
      </h3>
      <span class="text-gray-500"> • </span>
      <time class="text-gray-500 text-sm" :title="tweet.created_at">
        <router-link
          :to="{ name: 'Tweet', params: { tweet: tweet.publicKey.toBase58() } }"
          class="hover:underline"
        >
          {{ tweet.created_ago }}
        </router-link>
      </time>
    </div>
    <p class="whitespace-pre-wrap" v-text="tweet.content"></p>
    <router-link
      v-if="tweet.topic"
      :to="{ name: 'Topics', params: { topic: tweet.topic } }"
      class="inline-block mt-2 text-pink-500 hover:underline"
    >
      #{{ tweet.topic }}
    </router-link>
  </div>
</template>
