<template>
  <div class="stay-logged-in-popup">
    <h2>Stay Logged In</h2>
    <p>Your session is about to expire. Do you want to stay logged in?</p>
    <button @click="Session.touch">Stay Logged In</button>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/state';
const { Session } = useAppStore();
</script>

<style scoped>
.stay-logged-in-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
}
</style>