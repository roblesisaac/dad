<template>
    <div class="grid p20 text-left">
    
      <!-- Group Name -->
      <div class="cell-1 p20b">
    
        <div class="grid middle">
          <div class="cell-1-5 bold">
            Name:
          </div>
          <div class="cell-4-5">
            <input type="text" v-model="props.state.editingGroup.name" class="transparent bold colorBlue" />
          </div>
        </div>
    
        <div class="grid">
          <div class="cell-1 bold ">Info:</div>
          <div class="cell-1">
            <textarea v-model="props.state.editingGroup.info" class="edit-info" ></textarea>
          </div>
        </div>
    
      </div>
    
      <!-- Accounts In Group -->
      <div class="cell-1">
        <b>Accounts In Group:</b>
        <div class="dropHere">
          <span v-if="!props.state.editingGroup.accounts.length">Drag and drop groups here.</span>
          <Draggable class="draggable" group="accountDragger" v-model="props.state.editingGroup.accounts" v-bind="props.state.dragOptions()">
            <template #item="{element}">
              <button class="sharedWith">{{ element.mask }}</button>
            </template>
          </Draggable>
        </div>
      </div>
    
      <!-- Accounts Not In Group -->
      <div class="cell-1 p30y">
        <b>Accounts Not In Group:</b>
        <div class="dropHere">
          <Draggable class="draggable" group="accountDragger" v-model="accountsNotInGroup" v-bind="props.state.dragOptions()">
            <template #item="{element}">
              <button class="button sharedWith">{{ element.mask }}</button>
            </template>
        </Draggable>
        </div>
      </div>
    
      <div class="cell-1">
        <button @click="app.deleteGroup" class="transparent expanded colorRed">Remove Group</button>
      </div>
    
    </div>
    </template>
    
    <script setup>
    import { computed, watch } from 'vue';
    import Draggable from 'vuedraggable';
    import { useAppStore } from '@/stores/state';
    
    const { api } = useAppStore();
    
    const props = defineProps({
      state: Object
    });
    
    const accountsNotInGroup = computed(() => {
      const accountsInGroup = props.state.editingGroup.accounts.map(account => account._id);
    
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
        const groupId = props.state.editingGroup._id;
    
        return api.put(`api/groups/${groupId}`, group);
      }
    
      function sumOf(accounts, propName) {
        return accounts.reduce((acc, curr) => numeric(curr[propName]) + numeric(acc), 0)
      }
    
      function updateMemory(newGroupData) {
        const groupToUpdate = props.state.allUserGroups.find(group => group._id === props.state.editingGroup._id);
    
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
    
          const idToRemove = props.state.editingGroup._id
    
          props.state.views.pop();
          props.state.editingGroup = null;
          removeFromMemory(props.state.allUserGroups, idToRemove);
          api.delete(`api/groups/${idToRemove}`);
        },
        updateGroupName: async() => {
          await waitUntilTypingStops();
          await saveGroup({
            name: props.state.editingGroup.name
          });
        },
        updateGroup: async () => {
          const accounts = formatAccounts(props.state.editingGroup.accounts);
    
          const newGroupData = {
            name: props.state.editingGroup.name,
            info: props.state.editingGroup.info,
            accounts,
            totalCurrentBalance: sumOf(accounts, 'current'),
            totalAvailableBalance: sumOf(accounts, 'available')
          };
    
          updateMemory(newGroupData);
          saveGroup(newGroupData);
        }
      }
    
    }()
    
    watch(() => props.state.editingGroup.name, app.updateGroupName);
    watch(() => props.state.editingGroup.info, app.updateGroup);
    watch(() => props.state.editingGroup.accounts.length, app.updateGroup);
    
    </script>
    
    <style>
    .edit-info {
      width: 100%;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    </style>