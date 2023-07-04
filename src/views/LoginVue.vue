<template>
    <div class="grid">
        <div class="cell-1 cell-md-1-3"><LoginForm /></div>
        <div class="auto">{{ message }}</div>
    </div>
</template>

<script setup>
import LoginForm from "../components/LoginForm.vue";

const message = "hello world";
</script>