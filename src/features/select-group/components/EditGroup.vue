<template>
    <div class="grid gap-5 p-5 text-left">
    
      <!-- Back button -->
      <div class="w-full pb-2.5">
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">← Back</button>
      </div>
    
      <!-- Group Name -->
      <div class="w-full pb-5">
    
        <div class="grid grid-cols-5 items-center">
          <div class="col-span-1 font-bold">
            Name:
          </div>
          <div class="col-span-4">
            <input type="text" v-model="props.group.name" class="w-full bg-transparent font-bold text-blue-600 focus:outline-none" />
          </div>
        </div>
    
        <div class="grid grid-cols-1">
          <div class="font-bold">Info:</div>
          <div class="w-full">
            <textarea v-model="props.group.info" class="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
    
      </div>
    
      <!-- Accounts In Group -->
      <div class="w-full">
        <b>Accounts In Group:</b>
        <div class="min-h-[100px] border border-gray-300 rounded-md p-2 bg-gray-50">
          <span v-if="!props.group.accounts.length" class="text-gray-500">Drag and drop groups here.</span>
          <Draggable class="flex flex-wrap gap-2" group="accountDragger" v-model="props.group.accounts" v-bind="dragOptions(1)">
            <template #item="{element}">
              <button class="px-3 py-1 bg-blue-500 text-white rounded-full text-sm">{{ element.mask }}</button>
            </template>
          </Draggable>
        </div>
      </div>
    
      <!-- Accounts Not In Group -->
      <div class="w-full py-7">
        <b>Accounts Not In Group:</b>
        <div class="min-h-[100px] border border-gray-300 rounded-md p-2 bg-gray-50">
          <Draggable class="flex flex-wrap gap-2" group="accountDragger" v-model="accountsNotInGroup" v-bind="dragOptions(1)">
            <template #item="{element}">
              <button class="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full text-sm">{{ element.mask }}</button>
            </template>
        </Draggable>
        </div>
      </div>
    
      <div class="w-full">
        <button @click="handleDeleteGroup" class="w-full bg-transparent text-red-600 hover:bg-red-100 py-2 rounded">Remove Group</button>
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
    const emit = defineEmits(['close']);

    const props = defineProps({
      group: Object
    });

    const { deleteGroup, updateGroup } = useEditGroup();
    
    const accountsNotInGroup = computed(() => {
      const accountsInGroup = props.group.accounts.map(account => account._id);
    
      return state.allUserAccounts.filter(account => {
        return !accountsInGroup.includes(account._id);
      });
    });

    function handleDeleteGroup() {
      deleteGroup(props.group);
      emit('close');
    }
    
    watch(() => props.group, updateGroup, { deep: true });
    
    </script>