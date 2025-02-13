<template>
  <div class="login-container">
    <button @click="handleLogin" class="login-button">
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