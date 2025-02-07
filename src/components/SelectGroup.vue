<template>
<div class="grid select-group">
  <!-- Net-worth -->
  <div class="cell-1 net-worth bold p30">
    Net-Worth: <NetWorth :accounts="props.state.allUserAccounts" :state="state" />
  </div>

  <Draggable v-model="props.state.allUserGroups" v-bind="props.state.dragOptions(100)" handle=".handlerGroup" class="cell-1">
    <template #item="{element}">
      <GroupRow :key="element._id" :app="app" :element="element" :state="state" />
    </template>
  </Draggable>

  <!-- LinkNewAccount -->
  <button @click="app.linkNewAccount" href="#" class="linkAccount proper colorBlue">
    <b v-if="props.state.linkToken">Link New Account +</b>
    <b v-else>Loading <LoadingDots /></b>
  </button>

  <!-- Create New Group -->
  <div class="cell-1 proper">
    <button @click="app.createNewGroup" class="button expanded new-group">Create New Group +</button>
  </div>

  <!-- Reconnect Existing Institutions -->
  <div class="cell-1 proper">
    <button @click="props.state.views.push('ItemRepair')" class="button expanded item-repair">Update Existing Institutions</button>
  </div>

</div>
</template>

<script setup>
import { nextTick, watch } from 'vue';
import GroupRow from './GroupRow.vue';
import NetWorth from './NetWorth.vue';
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
    if(props.state.linkToken) {
      return;
    }
    
    try {
      const fetchedLinkToken = await api.post('api/plaid/connect/link');

      props.state.linkToken = fetchedLinkToken;
    } catch (err) {
      console.log(err);
    }
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
.net-worth {
  background-color: antiquewhite;
  color: #0000;
  margin-bottom: 20px;
  border: 1px solid #000;
  box-shadow: 3px 3px #000;
  border-radius: 3px;
  color: #000;
}

.select-group {
  background-color: #f4f8f9;
  padding: 30px 20px;
  font-weight: normal;
}

.linkAccount, .new-group, .item-repair {
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  width: 100%;
}

.new-group, .linkAccount {
  background: lightblue;
  color: #000;
}

.item-repair {
  background: lightgoldenrodyellow;
  color: #000;
}
</style>