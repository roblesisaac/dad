<template>
  <div class="login-container">
    <h1>Welcome</h1>
    <button 
      @click="handleLogin" 
      class="login-button"
    >
      Login with Auth0
    </button>
  </div>
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue'

const { loginWithRedirect } = useAuth0()

const handleLogin = async () => {
  await loginWithRedirect({
    appState: { targetUrl: 'spendingreport' }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.login-button {
  padding: 12px 24px;
  font-size: 1.1em;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.login-button:hover {
  background-color: #45a049;
}
</style> 