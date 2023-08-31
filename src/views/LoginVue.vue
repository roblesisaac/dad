<template>
    <div class="grid p30">
        <div class="cell-1 cell-md-1-3"><LoginForm /></div>
        <div class="cell auto">
            <h1>Welcome!</h1>
            <p>
                &#8226; Easily connect to your bank with Plaid.<br />
                &#8226; View your Income, Expenses, and Net.<br />
                &#8226; Search transaction by date.
            </p>
        </div>
    </div>
</template>

<script setup>
import LoginForm from "../components/LoginForm.vue";;
</script>