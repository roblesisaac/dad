<template>
  <div class="callback-container">
    <p>Processing login...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isAuthenticated, user } from '../utils/auth.js'

const router = useRouter()

onMounted(() => {
  const hash = window.location.hash
  if (hash) {
    // Parse the hash fragment
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const idToken = params.get('id_token')

    if (accessToken && idToken) {
      // Store tokens securely (you might want to use a more secure storage method)
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('id_token', idToken)
      
      isAuthenticated.value = true
      // Redirect to home or dashboard
      router.push('/')
    }
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