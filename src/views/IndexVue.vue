<template>
  <div class="grid">
      <div class="cell-1">
          <ConsentBanner />
      </div>
      <div class="cell-1 cell-md-1-3"><LoginForm /></div>
      <div class="cell auto p30">
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
import LoginForm from '../components/LoginForm.vue';
import ConsentBanner from '../components/ConsentBanner.vue';
</script>