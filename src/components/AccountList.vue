<template>
<div class="grid">
  <div class="cell-1 section line50">
    <a v-if="state.linkToken" @click="app.linkNewAccount" href="#" class="section-content">+ Link New Account</a>
    <b v-else>Loading <LoadingDots /></b>
  </div>
  <div v-for="acct in state.userAccounts" class="cell-1 section b-top">
    <a @click="app.selectAccount(acct)" href="#" class="section-content proper line50">{{ acct.subtype }} {{  acct.mask }}</a>
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
    return Plaid.create({
      token: state.linkToken,
      onSuccess: async function(publicToken) {
        const accessToken = await api.post('api/plaid/exchange', { publicToken });

        console.log({ accessToken });
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  async function fetchLinkToken() {
    state.linkToken = state.linkToken || await api.get('api/link/token');
  }

  return {
    init: async () => {
      await fetchLinkToken();
    },
    linkNewAccount: async () => {
      const link = createLink();

      link.open();
    },
    selectAccount: (acct) => {
      state.selectedAccount = acct;
      state.view = 'home';
    }
  }
}();

app.init();
</script>