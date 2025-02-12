<template>
  <div class="callback-container">
    <p>Processing login...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { useRouter } from 'vue-router'

const { handleRedirectCallback, isAuthenticated, user } = useAuth0()
const router = useRouter()

onMounted(async () => {
  try {
    // Handle the authentication callback
    await handleRedirectCallback()
    
    // If authentication is successful, redirect to home
    if (isAuthenticated.value) {
      router.push('/')
    }
  } catch (error) {
    console.error('Error handling callback:', error)
    router.push('/login')
  }
})
</script>

<style scoped>
.callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}
</style> 