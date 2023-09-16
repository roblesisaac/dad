<template>
<div class="grid">    
  <button v-if="state.linkToken" @click="app.linkNewAccount" href="#" class="acctButton section proper"><PlusVue class="icon" /> Link New Account</button>
  <div v-else class="cell-1 section line50">
    <b>Loading <LoadingDots /></b>
  </div>
  <button v-for="acct in state.userAccounts" @click="app.selectAccount(acct)" href="#" class="acctButton section b-top proper">
    {{ acct.subtype }} {{  acct.mask }} <ChevronRight class="icon" />
  </button>
</div>
</template>

<script setup>
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';
import PlusVue from 'vue-material-design-icons/Plus.vue';
import LoadingDots from './LoadingDots.vue';
import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const app = function() {
  function createLink() {
    return Plaid.create({
      token: state.linkToken,
      // receivedRedirectUri: window.location.href,
      onSuccess: async function(publicToken) {
        const newAccounts = await api.post('api/plaid/exchange', { publicToken });
        state.userAccounts = state.userAccounts.concat(newAccounts);
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  async function fetchLinkToken() {
    state.linkToken = state.linkToken || await api.post('api/plaid/connect');
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
      state.selectedTab.account = acct;
      state.view = 'home';
    }
  }
}();

app.init();
</script>