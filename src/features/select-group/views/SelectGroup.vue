<template>
  <div class="max-w-4xl mx-auto p-6">
    <!-- Header with Net Worth -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-gray-800 mb-4">Account Groups</h1>
      
      <!-- Net-worth Card -->
      <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-500">Total Net Worth</h4>
          <div class="text-lg font-bold text-indigo-700">
            <NetWorth :accounts="state.allUserAccounts" :digits="0" :isLarge="true" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!editingGroup">
      <!-- Groups Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-medium text-gray-700">Your Account Groups</h2>
        <span class="text-sm text-gray-500">{{ state.allUserGroups.length }} groups</span>
      </div>
      
      <!-- Draggable Group List -->
      <div class="space-y-3 mb-6">
        <Draggable 
          v-model="state.allUserGroups" 
          v-bind="dragOptions(100)" 
          handle=".handler-group" 
          class="space-y-3"
        >
          <template #item="{element}">
            <GroupRow 
              :key="element._id" 
              :element="element" 
              @edit-group="editingGroup = element"
              @select-group="emit('select-group', element)"
            />
          </template>
        </Draggable>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 gap-3 max-w-md mx-auto">
        <button 
          @click="createNewGroup" 
          class="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-sm"
        >
          <PlusCircle class="w-4 h-4 mr-2" />
          Create New Group
        </button>
        
        <button 
          @click="router.push({ name: 'onboarding' })" 
          class="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Update Existing Institutions
        </button>
      </div>
    </div>

    <!-- Edit Group Form -->
    <div v-else class="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div class="flex items-center mb-4">
        <button 
          @click="editingGroup = null" 
          class="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft class="w-4 h-4 mr-1" />
          Back to Groups
        </button>
      </div>
      <EditGroup @close="editingGroup = null" :group="editingGroup" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import GroupRow from '../components/GroupRow.vue';
import NetWorth from '../components/NetWorth.vue';
import EditGroup from '../components/EditGroup.vue';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';
import { PlusCircle, RefreshCw, ChevronLeft } from 'lucide-vue-next';

const { Draggable, dragOptions } = useDraggable();
const router = useRouter();
const { state } = useDashboardState();
const editingGroup = ref(null);
const emit = defineEmits(['select-group']);
const { createNewGroup } = useSelectGroup();

watch(() => state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});
</script> 