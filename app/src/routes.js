export default [
    {
        name: 'Home',
        path: '/',
        component: require('@/components/PageHome').default,
    },
    {
        name: 'Topics',
        path: '/topics/:topic?',
        component: require('@/components/PageTopics').default,
    },
    {
        name: 'Users',
        path: '/users/:author?',
        component: require('@/components/PageUsers').default,
    },
    {
        name: 'Profile',
        path: '/profile',
        component: require('@/components/PageProfile').default,
    },
    {
        name: 'Tweet',
        path: '/tweet/:tweet',
        component: require('@/components/PageTweet').default,
    },
    {
        name: 'NotFound',
        path: '/:pathMatch(.*)*',
        component: require('@/components/PageNotFound').default,
    },
]
