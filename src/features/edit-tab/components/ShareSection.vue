<template>
<div v-if="route.name === 'edit-tab'" class="x-grid middle dottedRow">
  <div @click="app.select('sharing')" class="cell-1 p20">
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
      <Draggable class="draggable" group="groupDragger" v-model="selectedTab.showForGroup" v-bind="dragOptions(100)">
        <template #item="{element}">
          <button class="sharedWith">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
    <ScrollingContent class="p30y">
      <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInTab" v-bind="dragOptions(100)">
        <template #item="{element}">
          <button class="button sharedWith">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </ScrollingContent>
  </div>

  <div v-if="editState.selectedRuleType==='sharing' && selectedTab.showForGroup.length > 1" class="cell-1 p10x p10b">
    <button @click="app.makeTabUnique" class="uniqueBtn expanded">Make Tab Unique?</button>
  </div>
</div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, Minus } from 'lucide-vue-next';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';

import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useDraggable } from '@/shared/composables/useDraggable';

const route = useRoute();

const { Draggable, dragOptions } = useDraggable();
const { state } = useDashboardState();

const props = defineProps({
  editState: Object
});

const selectedTab = computed(() => state.selected.tab);

const unselectedGroupsInTab = computed(() => {
  return state.allUserGroups
    .filter(group => !selectedTab.value.showForGroup.includes(group._id))
    .map(group => group._id);
});

function getGroupName(groupId) {
  return state.allUserGroups.find(group => group._id === groupId)?.name;
}
</script> 