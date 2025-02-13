<template>
<div v-if="!state.is('EditRule')" class="grid middle dottedRow">
  <div @click="app.select('sharing')" class="cell-1 p20">
    <div class="grid">
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
      <Draggable class="draggable" group="groupDragger" v-model="selectedTab.showForGroup" v-bind="state.dragOptions(100)">
        <template #item="{element}">
          <button class="sharedWith">{{ getGroupName(element) }}</button>
        </template>
      </Draggable>
    </div>
  </div>

  <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
    <ScrollingContent class="p30y">
      <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInTab" v-bind="state.dragOptions(100)">
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
import { Plus, Minus } from 'lucide-vue-next';
import Draggable from 'vuedraggable';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';

const props = defineProps({
  editState: Object,
  state: Object,
  app: Object
});

const selectedTab = computed(() => props.state.selected.tab);

const unselectedGroupsInTab = computed(() => {
  return props.state.allUserGroups
    .filter(group => !selectedTab.value.showForGroup.includes(group._id))
    .map(group => group._id);
});

function getGroupName(groupId) {
  return props.state.allUserGroups.find(group => group._id === groupId)?.name;
}
</script> 