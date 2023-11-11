<template>
<div class="grid p20">

  <!-- Group Name -->
  <div class="cell-1 p20b">
    <div class="grid middle">
      <div class="cell-1-5 bold">
        Name:
      </div>
      <div class="cell-4-5">
        <input type="text" v-model="props.editingGroup.name" class="transparent bold colorBlue" />
      </div>
    </div>
  </div>

  <!-- Accounts In Group -->
  <div class="cell-1">
    <b>Accounts In Group:</b>
    <div class="dropHere">
      <span v-if="!props.editingGroup.accounts.length">Drag and drop groups here.</span>
      <Draggable class="draggable" group="accountDragger" v-model="props.editingGroup.accounts" v-bind="dragOptions">
        <button v-for="account in props.editingGroup.accounts" class="sharedWith">{{ account.mask }}</button>
      </Draggable>
    </div>
  </div>

  <!-- Accounts Not In Group -->
  <div class="cell-1 p30y">
    <b>Accounts Not In Group:</b>
    <ScrollingContent class="">
    <Draggable class="draggable dropHere" group="accountDragger" v-model="accountsNotInGroup" v-bind="dragOptions">
      <button v-for="account in accountsNotInGroup" class="button sharedWith">{{ account.mask }}</button>
    </Draggable>
    </ScrollingContent>
  </div>

  <div class="cell-1">
    <button @click="app.deleteGroup" class="transparent expanded colorRed">Remove Group</button>
  </div>

</div>
</template>

<script setup>
import { computed, defineProps, watch } from 'vue';
import { VueDraggableNext as Draggable } from 'vue-draggable-next';
import ScrollingContent from './ScrollingContent.vue';

import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const dragOptions = {
  animation: 200,
  touchStartThreshold: 100
};

const props = defineProps({
  editingGroup: Object,
  selectGroupState: Object,
  state: Object
});

const accountsNotInGroup = computed(() => {
  const accountsInGroup = props.editingGroup.accounts.map(account => account._id);

  return props.state.allUserAccounts.filter(account => {
    return !accountsInGroup.includes(account._id);
  });
});

const editGroupState = {
  typingTimer: null
}

const app = function() {
  function formatAccounts(accounts) {
    const propsToKeep = ['_id', 'account_id', 'mask', 'current', 'available'];

    return accounts.map(account => {
      const accountData = {};

      propsToKeep.forEach(prop => accountData[prop] = account[prop] || account.balances?.[prop] || 0);

      return accountData;
    });
  }

  function numeric(value) {
    const number = parseFloat(value);

    return isNaN(number) ? 0 : number;
  }

  function removeFromMemory(allGroups, idToRemove) {
    props.state.allUserGroups = allGroups.filter(group => group._id !== idToRemove);
  }

  function saveGroup(group) {
    const groupId = props.editingGroup._id;

    return api.put(`api/groups/${groupId}`, group);
  }

  function sumOf(accounts, propName) {
    return accounts.reduce((acc, curr) => numeric(curr[propName]) + numeric(acc), 0)
  }

  function updateMemory(newGroupData) {
    const groupToUpdate = props.state.allUserGroups.find(group => group._id === props.editingGroup._id);

    groupToUpdate.totalAvailableBalance = newGroupData.totalAvailableBalance;
    groupToUpdate.totalCurrentBalance = newGroupData.totalCurrentBalance;
  }

  function waitUntilTypingStops(ms=500) {
    return new Promise((resolve) => {
      clearTimeout(editGroupState.typingTimer);
      editGroupState.typingTimer = setTimeout(resolve, ms);
    });
  }

  return {
    deleteGroup: async () => {
      if(!confirm('Remove Group?')) {
        return;
      }

      const idToRemove = props.editingGroup._id

      props.selectGroupState.editingGroup = null;
      removeFromMemory(props.state.allUserGroups, idToRemove);
      api.delete(`api/groups/${idToRemove}`);
      // remove all tabs that only have showForGroup = idToRemove
    },
    updateGroupName: async() => {
      await waitUntilTypingStops();
      await saveGroup({
        name: props.editingGroup.name
      });
    },
    updateGroup: async () => {
      const accounts = formatAccounts(props.editingGroup.accounts);

      const newGroupData = {
        name: props.editingGroup.name,
        accounts,
        totalCurrentBalance: sumOf(accounts, 'current'),
        totalAvailableBalance: sumOf(accounts, 'available')
      };

      updateMemory(newGroupData);
      saveGroup(newGroupData);
    }
  }

}()

watch(() => props.editingGroup.name, app.updateGroupName);
watch(() => props.editingGroup.accounts.length, app.updateGroup);

</script>