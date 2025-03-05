<template>
<div v-if="route.name === 'edit-tab'" class="grid grid-cols-1 items-center border-b border-dotted border-gray-400">
  <div @click="select('sharing')" class="col-span-1 p-5 cursor-pointer hover:bg-gray-100">
    <div class="grid grid-cols-2">
      <div class="col-span-1">
        <span class="text-indigo-800 font-bold tracking-wider">Share</span>
      </div>
      <div class="col-span-1 text-right">        
        <Minus v-if="editState.selectedRuleType==='sharing'" class="text-pink-600" />
        <Plus v-else class="text-green-600" />
      </div>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="col-span-1 px-2.5">
    <h4 class="font-bold text-indigo-800 mb-2">Groups Tab Is Shared With:</h4>
    <div class="border-2 border-dashed border-gray-400 rounded p-4 bg-gray-50 min-h-[80px]">
      <span v-if="!selectedTab.showForGroup.length" class="text-gray-500 italic">Drag and drop groups here.</span>
      <Draggable 
        class="flex flex-wrap gap-2" 
        group="groupDragger" 
        v-model="selectedTab.showForGroup" 
        v-bind="dragOptions(100)"
        @change="onDragChange">
        <template #item="{element}">
          <button class="bg-purple-100 border-2 border-purple-700 text-purple-800 font-bold py-1 px-3 rounded shadow-[2px_2px_0px_#805ad5] hover:shadow-[1px_1px_0px_#805ad5] transition-all duration-200">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="col-span-1 px-2.5">
    <ScrollingContent class="py-7">
      <Draggable 
        class="flex flex-wrap gap-2" 
        group="groupDragger" 
        v-model="unselectedGroupsInTab" 
        v-bind="dragOptions(100)"
        @change="onDragChange">
        <template #item="{element}">
          <button class="bg-cyan-100 border-2 border-cyan-700 text-cyan-800 font-bold py-1 px-3 rounded shadow-[2px_2px_0px_#0987a0] hover:shadow-[1px_1px_0px_#0987a0] transition-all duration-200">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </ScrollingContent>
  </div>

  <div v-if="editState.selectedRuleType==='sharing' && selectedTab.showForGroup.length > 1" class="col-span-1 px-2.5 pb-2.5">
    <button @click="makeTabUnique" class="w-full bg-yellow-100 border-2 border-yellow-600 text-yellow-800 font-bold py-2 px-4 rounded shadow-[3px_3px_0px_#d69e2e] hover:shadow-[1px_1px_0px_#d69e2e] transition-all duration-200">Make Tab Unique?</button>
  </div>
</div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { Plus, Minus } from 'lucide-vue-next';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';
import { useEditTab } from '../composables/useEditTab';
import { useDraggable } from '@/shared/composables/useDraggable';

const route = useRoute();
const { Draggable, dragOptions } = useDraggable();

const props = defineProps({
  editState: Object
});

const { 
  selectedTab,
  unselectedGroupsInTab,
  getGroupName,
  makeTabUnique,
  saveTabGroups,
  select
} = useEditTab(props.editState);

/**
 * Handle changes from drag and drop operations
 * Saves the updated tab configuration to the API
 */
async function onDragChange() {
  // Only save if changes actually happened (items were added or removed)
  await saveTabGroups();
}
</script> 