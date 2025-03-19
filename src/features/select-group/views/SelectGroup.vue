<template>
  <div class="px-4 py-5">
    <!-- Net-worth Card -->
    <div class="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-500">Net Balance</h4>
        <div class="text-lg font-bold text-indigo-700">
          <NetBalance :accounts="state.allUserAccounts" :digits="0" />
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Custom Groups Section -->
      <div class="border border-gray-200 rounded-lg shadow-sm">
        <div 
          class="flex items-center justify-between p-4 cursor-pointer border-b border-gray-200"
          @click="toggleCustomGroups"
        >
          <div class="flex items-center">
            <h4 class="font-medium text-gray-700">Custom Groups</h4>
            <span class="ml-2 text-xs text-gray-500">{{ customGroups.length }} groups</span>
          </div>
          <ChevronDown v-if="showCustomGroups" class="w-5 h-5 text-gray-500" />
          <ChevronRight v-else class="w-5 h-5 text-gray-500" />
        </div>
        
        <div v-if="showCustomGroups" class="p-4">
          <Draggable 
            v-model="customGroups" 
            v-bind="dragOptions(100)" 
            handle=".handler-group" 
            class="space-y-3"
            @end="updateGroupSorting"
          >
            <template #item="{element}">
              <GroupRow 
                :key="element._id" 
                :element="element" 
                @edit-group="openEditGroupModal(element)" 
                @select-group="handleSelectGroup(element)"
              />
            </template>
          </Draggable>
          
          <div v-if="customGroups.length === 0" class="text-center py-4 text-gray-500 text-sm">
            No custom groups yet
          </div>
          
          <!-- Create New Group Button (moved here) -->
          <button 
            @click="handleCreateNewGroup" 
            class="flex items-center justify-center w-full px-4 py-2.5 mt-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-sm"
          >
            <PlusCircle class="w-4 h-4 mr-2" />
            Create New Group
          </button>
        </div>
      </div>
      
      <!-- Bank Accounts Section -->
      <div class="border border-gray-200 rounded-lg shadow-sm">
        <div 
          class="flex items-center justify-between p-4 cursor-pointer border-b border-gray-200"
          @click="toggleBankAccounts"
        >
          <div class="flex items-center">
            <h4 class="font-medium text-gray-700">Bank Accounts</h4>
            <span class="ml-2 text-xs text-gray-500">{{ bankAccounts.length }} accounts</span>
          </div>
          <ChevronDown v-if="showBankAccounts" class="w-5 h-5 text-gray-500" />
          <ChevronRight v-else class="w-5 h-5 text-gray-500" />
        </div>
        
        <div v-if="showBankAccounts" class="p-4">
          <Draggable 
            v-model="bankAccounts" 
            v-bind="dragOptions(100)" 
            handle=".handler-group" 
            class="space-y-3"
            @end="updateGroupSorting"
          >
            <template #item="{element}">
              <GroupRow 
                :key="element._id" 
                :element="element" 
                @edit-group="openEditGroupModal(element)" 
                @select-group="handleSelectGroup(element)"
              />
            </template>
          </Draggable>
          
          <div v-if="bankAccounts.length === 0" class="text-center py-4 text-gray-500 text-sm">
            No bank accounts found
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 gap-3 mt-6">
        <button 
          @click="goToOnboarding" 
          class="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Update Existing Institutions
        </button>
        
        <button 
          @click="handleManageBanks" 
          class="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Building class="w-4 h-4 mr-2" />
          Manage Banks
        </button>
      </div>
    </div>

    <!-- Edit Group Modal -->
    <EditGroupModal
      v-if="showEditGroupModal"
      :is-open="showEditGroupModal"
      :group="editingGroup"
      @close="closeEditGroupModal"
      @delete-group="handleDeleteGroup"
    />
    
    <!-- Banks Modal -->
    <BanksModal
      v-if="showBanksModal"
      :is-open="showBanksModal"
      @close="showBanksModal = false"
      @connect-bank-complete="handleBankConnected"
    />
    
    <!-- Sync Sessions Modal for direct bank sync when only one bank exists -->
    <SyncSessionsModal
      :is-open="isSyncSessionsModalOpen"
      :bank="selectedBank"
      @close="closeSyncSessionsModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useBanks } from '@/features/banks/composables/useBanks.js';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';

import GroupRow from '../components/GroupRow.vue';
import NetBalance from '../components/NetBalance.vue';
import { PlusCircle, RefreshCw, ChevronDown, ChevronRight, Building } from 'lucide-vue-next';

// Modals
import EditGroupModal from '../components/EditGroupModal.vue';
import BanksModal from '@/features/banks/components/BanksModal.vue';
import SyncSessionsModal from '@/features/banks/components/SyncSessionsModal.vue';

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

// Collapsible sections state
const showCustomGroups = ref(true);
const showBankAccounts = ref(true);

// Computed properties to split groups into two categories
const customGroups = ref([]);
const bankAccounts = ref([]);

const setGroupsAndAccounts = () => {
  customGroups.value = state.allUserGroups.filter(group => group.accounts.length > 1);
  bankAccounts.value = state.allUserGroups.filter(group => group.accounts.length < 2);
}

// Toggle section visibility
const toggleCustomGroups = () => {
  showCustomGroups.value = !showCustomGroups.value;
};

const toggleBankAccounts = () => {
  showBankAccounts.value = !showBankAccounts.value;
};

// Update sorting when groups are reordered
const updateGroupSorting = () => {
  const allGroups = [...customGroups.value, ...bankAccounts.value];
  allGroups.forEach((group, index) => {
    group.sort = index;
  });
};

// Edit group modal state
const showEditGroupModal = ref(false);

// Open the edit group modal
const openEditGroupModal = (group) => {
  editingGroup.value = group;
  showEditGroupModal.value = true;
};

// Close the edit group modal
const closeEditGroupModal = () => {
  setGroupsAndAccounts();
  showEditGroupModal.value = false;
  editingGroup.value = null;
};

// Banks modal state
const showBanksModal = ref(false);

// Get banks functionality from useBanks
const {
  banks,
  selectedBank,
  fetchBanks,
  selectBank
} = useBanks();

// Sync sessions modal state
const isSyncSessionsModalOpen = ref(false);

const goToOnboarding = () => {
  emit('close');
  router.push({ name: 'onboarding' });
};

const handleDeleteGroup = (group) => {
  setGroupsAndAccounts();
  closeEditGroupModal();
}

const handleCreateNewGroup = async () => {
  const newGroup = await createNewGroup();
  setGroupsAndAccounts();
  openEditGroupModal(newGroup);
}

const handleSelectGroup = (group) => {
  emit('close');
  selectGroup(group);
};

// Handle the Manage Banks button click
const handleManageBanks = async () => {  
  // If we have exactly one bank connected, show the sync sessions modal directly
  if (banks.value.length === 1) {
    // Make sure the bank is selected and sync sessions are loaded
    selectBank(banks.value[0]);
    isSyncSessionsModalOpen.value = true;
  } else {
    // Otherwise show the regular banks modal
    showBanksModal.value = true;
  }
};

// Handle bank connection completion
const handleBankConnected = async () => {
  try {
    // Refresh banks list to see if we now have only one bank
    await fetchBanks();
    
    // Close the banks modal when we're done
    showBanksModal.value = false;
  } catch (error) {
    console.error('Error refreshing data after bank connection:', error);
  }
};

// SyncSessionsModal event handlers
const closeSyncSessionsModal = () => {
  isSyncSessionsModalOpen.value = false;
};

// Initialize data on mount
onMounted(async () => {
  setGroupsAndAccounts();
  // Fetch banks to determine how many are connected
  await fetchBanks();
  
  // If there's exactly one bank, preselect it for direct sync
  if (banks.value.length === 1) {
    await selectBank(banks.value[0]);
  }
});

// Watch for changes in banks count
watch(() => banks.value.length, (newCount) => {
  // Keep the bank selected if there's only one
  if (newCount === 1) {
    selectBank(banks.value[0]);
  }
});
</script> 