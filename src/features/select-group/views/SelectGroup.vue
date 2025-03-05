<template>
<div class="grid grid-cols-1 gap-4 bg-[#f4f8f9] p-[30px_20px]">
  <!-- Net-worth -->
  <div class="font-bold p-7 bg-[antiquewhite] mb-5 border border-black shadow-[3px_3px_#000] rounded">
    Net-Worth: <NetWorth :accounts="state.allUserAccounts" :digits="0" />
  </div>

  <div v-if="!editingGroup">
    <Draggable v-model="state.allUserGroups" v-bind="dragOptions(100)" handle=".handler-group" class="w-full">
      <template #item="{element}">
        <GroupRow :key="element._id" :element="element" @edit-group="editingGroup = element" />
      </template>
    </Draggable>

    <!-- Create New Group -->
    <div class="mt-4">
      <button @click="createNewGroup" class="w-full mb-5 bg-[lightblue] text-black border border-black shadow-[3px_3px_#000] py-2 px-4 rounded">Create New Group +</button>
    </div>

    <!-- Reconnect Existing Institutions -->
    <div class="mt-2">
      <button @click="router.push({ name: 'onboarding' })" 
              class="w-full mb-5 bg-[lightgoldenrodyellow] text-black border border-black shadow-[3px_3px_#000] py-2 px-4 rounded">Update Existing Institutions</button>
    </div>
  </div>

  <div v-else class="w-full">
    <EditGroup @close="editingGroup = null" :group="editingGroup" />
  </div>
</div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import GroupRow from '../components/GroupRow.vue';
import NetWorth from '../components/NetWorth.vue';
import EditGroup from '../components/EditGroup.vue';
import { useEditGroup } from '../composables/useEditGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const router = useRouter();
const { state } = useDashboardState();
const editingGroup = ref(null);

const { createNewGroup } = useEditGroup();

watch(() => state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});
</script> 