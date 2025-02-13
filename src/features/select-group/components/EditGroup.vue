<template>
    <div class="p-5 text-left bg-white rounded-lg shadow-md">
    
      <!-- Back button -->
      <div class="mb-4">
        <button @click="$emit('close')" class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          <span class="mr-2">←</span> Back
        </button>
      </div>
    
      <!-- Group Name -->
      <div class="mb-6">
    
        <div class="flex items-center mb-4">
          <div class="w-1/5 font-bold text-gray-700">
            Name:
          </div>
          <div class="w-4/5">
            <input type="text" v-model="props.state.editingGroup.name" 
                   class="w-full px-3 py-2 text-blue-600 font-bold bg-transparent border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
    
        <div class="space-y-2">
          <div class="font-bold text-gray-700">Info:</div>
          <div>
            <textarea v-model="props.state.editingGroup.info" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
    
      </div>
    
      <!-- Accounts In Group -->
      <div class="mb-6">
        <h3 class="mb-2 font-bold text-gray-700">Accounts In Group:</h3>
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[100px]">
          <span v-if="!props.state.editingGroup.accounts.length" class="text-gray-500">
            Drag and drop groups here.
          </span>
          <Draggable class="draggable" group="accountDragger" v-model="props.state.editingGroup.accounts" v-bind="props.state.dragOptions()">
            <template #item="{element}">
              <button class="px-3 py-2 mb-2 mr-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">
                {{ element.mask }}
              </button>
            </template>
          </Draggable>
        </div>
      </div>
    
      <!-- Accounts Not In Group -->
      <div class="mb-6">
        <h3 class="mb-2 font-bold text-gray-700">Accounts Not In Group:</h3>
        <div class="p-4 bg-gray-50 border border-gray-200 rounded-md min-h-[100px]">
          <Draggable class="draggable" group="accountDragger" v-model="accountsNotInGroup" v-bind="props.state.dragOptions()">
            <template #item="{element}">
              <button class="px-3 py-2 mb-2 mr-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                {{ element.mask }}
              </button>
            </template>
          </Draggable>
        </div>
      </div>
    
      <div>
        <button @click="deleteGroup" 
                class="w-full px-4 py-2 text-red-600 bg-white border border-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
          Remove Group
        </button>
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
    
    defineEmits(['close']);
    
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