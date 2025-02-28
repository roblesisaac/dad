<template>
    <div class="x-grid p20 text-left">
    
      <!-- Back button -->
      <div class="cell-1 p10b">
        <button @click="$emit('close')" class="button">← Back</button>
      </div>
    
      <!-- Group Name -->
      <div class="cell-1 p20b">
    
        <div class="x-grid middle">
          <div class="cell-1-5 bold">
            Name:
          </div>
          <div class="cell-4-5">
            <input type="text" v-model="state.editingGroup.name" class="transparent bold colorBlue" />
          </div>
        </div>
    
        <div class="x-grid">
          <div class="cell-1 bold ">Info:</div>
          <div class="cell-1">
            <textarea v-model="state.editingGroup.info" class="edit-info" ></textarea>
          </div>
        </div>
    
      </div>
    
      <!-- Accounts In Group -->
      <div class="cell-1">
        <b>Accounts In Group:</b>
        <div class="dropHere">
          <span v-if="!state.editingGroup.accounts.length">Drag and drop groups here.</span>
          <Draggable class="draggable" group="accountDragger" v-model="state.editingGroup.accounts" v-bind="dragOptions(1)">
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
          <Draggable class="draggable" group="accountDragger" v-model="accountsNotInGroup" v-bind="dragOptions(1)">
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
    import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
    import { useEditGroup } from '../composables/useEditGroup.js';
    import { useDraggable } from '@/shared/composables/useDraggable';
    
    const { Draggable, dragOptions } = useDraggable();    
    const { state } = useDashboardState();
    defineEmits(['close']);
    
    const { deleteGroup, updateGroupName, updateGroup } = useEditGroup();
    
    const accountsNotInGroup = computed(() => {
      const accountsInGroup = state.editingGroup.accounts.map(account => account._id);
    
      return state.allUserAccounts.filter(account => {
        return !accountsInGroup.includes(account._id);
      });
    });
    
    watch(() => state.editingGroup.name, updateGroupName);
    watch(() => state.editingGroup.info, updateGroup);
    watch(() => state.editingGroup.accounts.length, updateGroup);
    
    </script>
    
    <style>
    .edit-info {
      width: 100%;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    </style>