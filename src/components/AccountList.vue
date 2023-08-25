<template>
<div class="grid">    
  <button v-if="state.linkToken" @click="app.linkNewAccount" href="#" class="acctButton section proper">+ Link New Account</button>
  <div v-else class="cell-1 section line50">
    <b>Loading <LoadingDots /></b>
  </div>
  <button v-for="acct in state.userAccounts" @click="app.selectAccount(acct)" href="#" class="acctButton section b-top proper">
    {{ acct.subtype }} {{  acct.mask }}
  </button>
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