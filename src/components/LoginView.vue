<template>
  <div class="flex justify-center items-center min-h-[50vh]">
    <button 
      @click="handleLogin" 
      class="px-6 py-3 text-lg font-medium text-white bg-[#635DFF] hover:bg-[#4B45FF] rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#635DFF]"
    >
      Login with Auth0
    </button>
  </div>
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue'

const { loginWithRedirect } = useAuth0()

const handleLogin = async () => {
  try {
    await loginWithRedirect()
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.login-button {
  padding: 12px 24px;
  font-size: 1.1em;
  background-color: #635DFF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.login-button:hover {
  background-color: #4B45FF;
}
</style> 