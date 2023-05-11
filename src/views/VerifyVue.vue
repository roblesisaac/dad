<template>
    <div class="grid p30">
        <Transition>
        <div v-if="isLoggedIn" class="cell-1">
            <VerifyForm />
        </div>
        </Transition>
        <Transition>
        <div v-if="!isLoggedIn" class="cell-1">
            <b>Please login first.</b>
            <LoginForm />
        </div>
        </Transition>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue';
    import VerifyForm from '../components/VerifyForm.vue';
    import LoginForm from '../components/LoginForm.vue';
    const isLoggedIn = ref(true);

    onMounted(async () => {
        const loginCheck = await fetch('/login/check');
        const user = await loginCheck.json();

        isLoggedIn.value = user.isLoggedIn;
    });
</script>