<template>
<div class="grid">
  <!-- LinkNewAccount -->
  <button v-if="state.linkToken" @click="app.linkNewAccount" href="#" class="acctButton proper colorBlue"><PlusVue class="icon colorBlue" /> Link New Account</button>
  
  <!-- LoadingMessage -->
  <div v-else class="cell-1 line50">
    <b>Loading <LoadingDots /></b>
  </div>

  <!-- Select Group Buttons -->
  <button v-for="group in state.allUserGroups" 
    @click="app.selectGroup(group)"
    @dblclick="app.editGroup(group)"
    :group="group._id"
    class="acctButton b-top proper">
    <div class="grid middle">
      <div class="auto">
        {{ group.name }}
        <br><small class="colorBlack">{{ formatPrice(group.totalBalance) }}</small>
      </div>
      <div class="shrink">
        <ChevronRight class="icon" />
      </div>
    </div>
  </button>
</div>
</template>

<script setup>
import { nextTick } from 'vue';
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';
import PlusVue from 'vue-material-design-icons/Plus.vue';
import LoadingDots from './LoadingDots.vue';
import { useAppStore } from '../stores/app';
import { formatPrice } from '../utils';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const app = function() {
  function createLink() {
    return Plaid.create({
      token: state.linkToken,
      // receivedRedirectUri: window.location.href,
      onSuccess: async function(publicToken) {
        const { accounts, groups } = await api.post('api/plaid/exchange', { publicToken });
        state.allUserGroups = state.allUserGroups.concat(groups);
        state.allUserAccounts = state.allUserAccounts.concat(accounts);
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
    editGroup: (group) => {
      console.log({
        message: 'edditing',
        group
      })
    },
    init: async () => {
      await fetchLinkToken();
    },
    linkNewAccount: async () => {
      const link = createLink();

      link.open();
    },
    selectGroup: async (groupToSelect) => {
      const selectedGroup = state.selected.group;

      if(selectedGroup) {
        api.put(`api/groups/${selectedGroup._id}`, { isSelected: false });          
        selectedGroup.isSelected = false;
      }

      nextTick(() => {
        api.put(`api/groups/${groupToSelect._id}`, { isSelected: true });
        groupToSelect.isSelected = true;   
        state.view = 'home';
      });
    }
  }
}();

app.init();
</script>