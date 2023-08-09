<template>
<div class="grid">
  <div class="cell-1 section line50">
    <a v-if="state.linkToken" @click="app.linkNewAccount" href="#" class="section-content">+ Link New Account</a>
    <b v-else>Loading <LoadingDots /></b>
  </div>
  <div v-for="acct in state.userAccounts" class="cell-1 section b-top line50">
    <a href="#" class="section-content proper">{{ acct.name || acct }}</a>
  </div>
</div>
</template>

<script setup>
import LoadingDots from './LoadingDots.vue';
import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const app = function() {
  function createLink() {
    var linkHandler = Plaid.create({
      token: state.linkToken,
      onSuccess: function(publicToken) {
        // Handle successful Plaid Link flow
        console.log('Public token:', { publicToken });
        // Send the public token to your server to exchange it for an access token
      },
      onExit: function(err, metadata) {
        // Handle when the user exits the Plaid Link flow
        console.log('Link exit:', { err, metadata });
      },
    });

    // Open Plaid Link
    linkHandler.open();
  }

  async function fetchLinkToken() {
    state.linkToken = state.linkToken || await api.get('api/linktoken');
  }

  return {
    init: async () => {
      await fetchLinkToken();
    },
    linkNewAccount: async () => {
      createLink();
    }
  }
}();

app.init();
</script>