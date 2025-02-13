<template>
<div id="consent-banner">
  <small>We use cookies and collect data to improve your experience. By continuing to use our site, you consent to our <a href="/privacypolicy">Privacy Policy</a> and <a href="/termsofservice">Terms of Service</a>.</small>
  <a href @click="acceptConsent" class="p20l"><small>Accept »</small></a>
</div>
</template>

<script setup>
function acceptConsent() {
  console.log('accept consent');
}
</script>

<style>
#consent-banner {
  background-color: #007bff;
  color: #fff; 
  padding: 5px; 
  text-align: center;
}
#consent-banner a {
  color: #fff; 
  text-decoration: underline;
}
#consent-banner a {
  border: none;
  cursor: pointer;
}
</style>