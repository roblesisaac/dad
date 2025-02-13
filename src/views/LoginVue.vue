<template>

</template>

<script setup>
import { onMounted } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue'

const { loginWithRedirect } = useAuth0();

onMounted(async () => {
  await loginWithRedirect();
});
</script>