<template>
    <div class="grid p30">
        <VerifyForm />
    </div>
</template>

<script setup>
    import { onMounted } from 'vue';
    import VerifyForm from '../components/VerifyForm.vue';

    const baseUrl = '/api';

    onMounted(async () => {
        const checkAuth = await fetch(baseUrl+'/login/check');
        const user = await checkAuth.json();

        if(!user.isLoggedIn) {
            return window.location = '/login';
        }

        if(user.email_verified) {
            return window.location = '/';
        }
    });
</script>