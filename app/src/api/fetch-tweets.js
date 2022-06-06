import { useWorkspace } from '@/composables'
import { Tweet } from '@/models'
import bs58 from 'bs58'

export const fetchTweets = async (filters = []) => {
    const { program } = useWorkspace()
    const tweets = await program.value.account.tweet.all(filters);
    return tweets.map(tweet => new Tweet(tweet.publicKey, tweet.account))
}

export const authorFilter = authorBase58PublicKey => ({
    memcmp: {
        offset: 8, // Discriminator.
        bytes: authorBase58PublicKey,
    }
})


export const topicFilter = topic => ({
    memcmp: {
        offset: 8 + // Discriminator.
            32 + // Author public key.
            8 + // Timestamp.
            4, // Topic string prefix.
        bytes: bs58.encode(Buffer.from(topic)),
    }
})