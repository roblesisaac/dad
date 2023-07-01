<template>
<form @submit.prevent="user.sendPasswordReset" class="grid">
<div class="cell-1 p10b">
    <div class="grid middle">
        <div class="cell-1">
        <label for="email">Email</label>
        <input id="email" v-model="user.email" autocomplete="email" type="text" />
        </div>
    </div>
</div>

</form>
</template>

<script setup>
import { ref } from 'vue';
import { load } from 'recaptcha-v3';

import LoadingDots from './LoadingDots.vue';
import { isValidEmail } from '../utils';
import { useAppStore } from '../stores/app';
const { api, cart } = useAppStore();

const user = function() {
    const state = ref({
        email
    });

    return {
        state,
        sendPasswordReset: () => {

        }
    }
}();

</script>