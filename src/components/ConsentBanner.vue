<template>
  <div class="bg-blue-600 text-white py-1.5 px-4 text-center text-sm">
    <span>
      We use cookies and collect data to improve your experience. By continuing to use our site, you consent to our 
      <a href="/privacypolicy" class="underline hover:text-blue-100">Privacy Policy</a> and 
      <a href="/termsofservice" class="underline hover:text-blue-100">Terms of Service</a>.
    </span>
    <button 
      @click="acceptConsent" 
      class="ml-5 underline hover:text-blue-100"
    >
      Accept »
    </button>
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