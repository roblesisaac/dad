<template>
<div v-if="route.name === 'edit-tab'" class="x-grid middle dottedRow">
  <div @click="select('sharing')" class="cell-1 p20">
    <div class="x-grid">
      <div class="cell auto">
        Share
      </div>
      <div class="cell auto right">        
        <Minus v-if="editState.selectedRuleType==='sharing'" />
        <Plus v-else />
      </div>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
    <h4 class="bold">Groups Tab Is Shared With:</h4>
    <div class="dropHere">
      <span v-if="!selectedTab.showForGroup.length">Drag and drop groups here.</span>
      <Draggable 
        class="draggable" 
        group="groupDragger" 
        v-model="selectedTab.showForGroup" 
        v-bind="dragOptions(100)"
        @change="onDragChange">
        <template #item="{element}">
          <button class="sharedWith">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
    <ScrollingContent class="p30y">
      <Draggable 
        class="draggable" 
        group="groupDragger" 
        v-model="unselectedGroupsInTab" 
        v-bind="dragOptions(100)"
        @change="onDragChange">
        <template #item="{element}">
          <button class="button sharedWith">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </ScrollingContent>
  </div>

  <div v-if="editState.selectedRuleType==='sharing' && selectedTab.showForGroup.length > 1" class="cell-1 p10x p10b">
    <button @click="makeTabUnique" class="uniqueBtn expanded">Make Tab Unique?</button>
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