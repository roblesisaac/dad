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
        <button @click="deleteGroup" class="transparent expanded colorRed">Remove Group</button>
      </div>
    
    </div>
    </template>
    
    <script setup>
    import { computed, watch } from 'vue';
    import Draggable from 'vuedraggable';
    import { useEditGroup } from '../composables/useEditGroup.js';
    
    const props = defineProps({
      state: Object
    });
    
    const { deleteGroup, updateGroupName, updateGroup } = useEditGroup(props.state);
    
    const accountsNotInGroup = computed(() => {
      const accountsInGroup = props.state.editingGroup.accounts.map(account => account._id);
    
      return props.state.allUserAccounts.filter(account => {
        return !accountsInGroup.includes(account._id);
      });
    });
    
    watch(() => props.state.editingGroup.name, updateGroupName);
    watch(() => props.state.editingGroup.info, updateGroup);
    watch(() => props.state.editingGroup.accounts.length, updateGroup);
    
    </script>
    
    <style>
    .edit-info {
      width: 100%;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    </style>