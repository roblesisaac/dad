<template>
<div class="grid select-group">
  
  <!-- LinkNewAccount -->
  <button v-if="props.state.linkToken" @click="app.linkNewAccount" href="#" class="linkAccount proper colorBlue"><PlusVue class="icon colorBlue" /> Link New Account</button>
  
  <!-- LoadingMessage -->
  <div v-else class="cell-1 line50">
    <b>Loading <LoadingDots /></b>
  </div>

  <Draggable v-model="props.state.allUserGroups" v-bind="props.state.dragOptions(100)" handle=".handlerGroup" class="cell-1">
    <template #item="{element}">
      <GroupRow :key="element._id" :app="app" :element="element" />
    </template>
  </Draggable>

  <!-- Create New Group -->
  <div class="cell-1 b-top proper">
    <button @click="app.createNewGroup" class="button expanded bgBlack">Create New Group +</button>
  </div>

</div>
</template>

<script setup>
import { nextTick, watch } from 'vue';
import GroupRow from './GroupRow.vue';
import PlusVue from 'vue-material-design-icons/Plus.vue';
import Draggable from 'vuedraggable';

import LoadingDots from './LoadingDots.vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();
const props = defineProps({
  App: Object,
  state: Object
});

const app = function() {
  function createLink() {
    return Plaid.create({
      token: props.state.linkToken,
      // receivedRedirectUri: window.location.href,
      onSuccess: async function(publicToken) {
        const { accounts, groups } = await api.post('api/plaid/exchange/token', { publicToken });
        props.state.allUserGroups = [ ...props.state.allUserGroups, ...groups ];
        props.state.allUserAccounts = [ ...props.state.allUserAccounts, ...accounts ];
        props.App.checkSyncStatus();
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  async function fetchLinkToken() {
    props.state.linkToken = props.state.linkToken || await api.post('api/plaid/connect/link');
  }

  return {
    createNewGroup: async () => {
      if(!confirm('Are you sure you want to create a new group?')) {
        return;
      }

      const newGroupData = {
        accounts: [],
        isSelected: false,
        name: `New Group ${props.state.allUserGroups.length}`
      }

      const savedNewGroup = await api.post('api/groups', newGroupData);
      props.state.allUserGroups.push(savedNewGroup);
    },
    editGroup: (group) => {
      props.state.editingGroup=group;
      props.state.views.push('EditGroup')
    },
    init: async () => {
      await fetchLinkToken();
    },
    linkNewAccount: async () => {
      const link = createLink();

      link.open();
    },
    selectGroup: (groupToSelect) => {
      const selectedGroup = props.state.selected.group;

      if(selectedGroup) {
        api.put(`api/groups/${selectedGroup._id}`, { isSelected: false });          
        selectedGroup.isSelected = false;
      }

      nextTick(() => {
        api.put(`api/groups/${groupToSelect._id}`, { isSelected: true });
        groupToSelect.isSelected = true;
        props.App.goBack();
      });
    }
  }
}();

app.init();

watch(() => props.state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});

</script>

<style>
.select-group {
  background-image: radial-gradient(#000 10%,transparent 10%),radial-gradient(#000 10%,transparent 10%);
  background-position: 0;
  background-size: 10px 10px;
  padding: 30px 20px;
  font-weight: normal;
}

.linkAccount {
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  width: 100%;
}
</style>