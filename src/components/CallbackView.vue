<template>
  <div class="flex justify-center items-center min-h-[50vh]">
    <div class="text-gray-700 flex flex-col items-center space-y-4">
      <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p>Processing login...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { useRouter } from 'vue-router'

const { handleRedirectCallback, isAuthenticated } = useAuth0()
const router = useRouter()

onMounted(async () => {
  try {
    await handleRedirectCallback()
    
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