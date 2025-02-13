<template>
    <div class="grid p30">
        <VerifyForm />
    </div>
</template>

<script setup>
    import { onMounted } from 'vue';
    import VerifyForm from '@/shared/components/VerifyForm.vue';

    const baseUrl = '/api';

    onMounted(async () => {
        const checkAuth = await fetch(baseUrl+'/login/check/auth');
        const user = await checkAuth.json();

        if(!user.isLoggedIn) {
            return window.location = '/login';
        }

        if(user.email_verified === true) {
            return window.location = '/';
        }
    });
</script>