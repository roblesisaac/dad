<template>
  <div class="px-4 py-5">
    <!-- Net-worth Card -->
    <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-500">Total Net Worth</h4>
        <div class="text-lg font-bold text-indigo-700">
          <NetWorth :accounts="state.allUserAccounts" :digits="0" />
        </div>
      </div>
    </div>

    <!-- Groups List -->
    <div v-if="!editingGroup" class="space-y-3">
      <!-- Groups Header -->
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-medium text-gray-700">Your Account Groups</h4>
        <span class="text-xs text-gray-500">{{ state.allUserGroups.length }} groups</span>
      </div>
      
      <!-- Draggable Group List -->
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
            @edit-group="editGroup(element)" 
            @select-group="handleSelectGroup(element)"
          />
        </template>
      </Draggable>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 gap-3 mt-6">
        <button 
          @click="createNewGroup" 
          class="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-sm"
        >
          <PlusCircle class="w-4 h-4 mr-2" />
          Create New Group
        </button>
        
        <button 
          @click="goToOnboarding" 
          class="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Update Existing Institutions
        </button>
        
        <button 
          @click="showBanksModal = true" 
          class="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Building class="w-4 h-4 mr-2" />
          Manage Banks
        </button>
      </div>
    </div>

    <!-- Edit Group Form -->
    <div v-else class="w-full">
      <div class="flex items-center mb-4">
        <button 
          @click="editingGroup = null" 
          class="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft class="w-4 h-4 mr-1" /> Back to Groups
        </button>
      </div>
      <EditGroup @close="editingGroup = null" :group="editingGroup" />
    </div>
    
    <!-- Banks Modal -->
    <BaseModal
      v-if="showBanksModal"
      :is-open="showBanksModal"
      title="Manage Connected Banks"
      size="xl"
      @close="showBanksModal = false"
    >
      <template #content>
        <BanksView @connect-bank-complete="handleBankConnected" />
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import GroupRow from '../components/GroupRow.vue';
import NetWorth from '../components/NetWorth.vue';
import EditGroup from '../components/EditGroup.vue';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';
import { PlusCircle, RefreshCw, ChevronLeft, Building } from 'lucide-vue-next';
import BaseModal from '@/shared/components/BaseModal.vue';
import BanksView from '@/features/banks/views/BanksView.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const router = useRouter();
const { state } = useDashboardState();
const editingGroup = ref(null);
const { Draggable, dragOptions } = useDraggable();
const { createNewGroup, selectGroup } = useSelectGroup();

// Banks modal state
const showBanksModal = ref(false);

// Edit a specific group
const editGroup = (group) => {
  editingGroup.value = group;
};

const goToOnboarding = () => {
  emit('close');
  router.push({ name: 'onboarding' });
};

const handleSelectGroup = (group) => {
  emit('close');
  selectGroup(group);
};

// Handle bank connection completion
const handleBankConnected = async () => {
  // Refresh data if needed
  // This would be a good place to refresh accounts or groups
  try {
    // You could add API calls here to refresh accounts or other data
    // that might be affected by connecting a new bank
    // For example:
    // await fetchUserAccounts();
    // await fetchUserGroups();
    
    showBanksModal.value = false;
  } catch (error) {
    console.error('Error refreshing data after bank connection:', error);
  }
};

watch(() => state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});
</script> 