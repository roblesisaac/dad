<template>
<div class="grid">
  
  <!-- LinkNewAccount -->
  <button v-if="props.state.linkToken" @click="app.linkNewAccount" href="#" class="acctButton proper colorBlue"><PlusVue class="icon colorBlue" /> Link New Account</button>
  
  <!-- LoadingMessage -->
  <div v-else class="cell-1 line50">
    <b>Loading <LoadingDots /></b>
  </div>

  <div class="cell-1">
  <Draggable v-model="props.state.allUserGroups" v-bind="props.state.dragOptions()" handle=".handlerGroup">
    <template #item="{element}">
      <div class="grid middle b-top proper text-left" :key="element._id">
        <div class="cell-3-24 p20">
          <DragHorizontalVariant class="handlerGroup" />
        </div>

        <div class="cell-19-24 p20y pointer" @click="app.selectGroup(element)">
          <b>{{ element.name }}</b><CheckBold v-if="element.isSelected" class="colorBlack" />
          <br><small class="colorBlack"><b>Info:</b> {{ element.info }}</small>
          <br><small class="colorBlack"><b>Current:</b> {{ formatPrice(element.totalCurrentBalance) }}</small>
          <br><small class="colorBlack"><b>Available:</b> {{ formatPrice(element.totalAvailableBalance) }}</small>
        </div>

        <div class="cell-2-24" @click="app.selectGroup(element)">
          <ChevronRight class="icon" />
        </div>

        </div>
    </template>
  </Draggable>
  </div>

  <!-- Create New Group -->
  <div class="cell-1 b-top proper">
    <button @click="app.createNewGroup" class="button expanded bgBlack">Create New Group +</button>
  </div>

</div>
</template>

<script setup>
import { nextTick } from 'vue';
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';
import CheckBold from 'vue-material-design-icons/CheckBold.vue'
import PlusVue from 'vue-material-design-icons/Plus.vue';
import Draggable from 'vuedraggable';
import DragHorizontalVariant from 'vue-material-design-icons/DragHorizontalVariant.vue';

import LoadingDots from './LoadingDots.vue';
import { useAppStore } from '../stores/state';
import { formatPrice } from '../utils';

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
</script>

<style>
.acctButton {
  box-shadow: none;
  width: 100%;
}
</style>