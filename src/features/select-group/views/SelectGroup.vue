<template>
  <div class="bg-white max-h-[80vh] overflow-y-auto w-full">
    <!-- Net-worth Header -->
    <div class="px-6 py-5 bg-white border-b-2 border-gray-100 flex items-center justify-between">
      <h4 class="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Net Balance</h4>
      <div class="text-xl font-black text-black tracking-tight">
        <NetBalance :accounts="state.allUserAccounts" :digits="0" />
      </div>
    </div>

    <!-- Custom Groups Section -->
    <div class="px-6 py-4">
      <div 
        class="flex items-center justify-between mb-4 cursor-pointer group"
        @click="toggleCustomGroups"
      >
        <div class="flex items-center gap-2">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Banking Groups</h2>
          <span class="text-[10px] font-black text-gray-300">{{ customGroups.length }}</span>
        </div>
        <div class="text-gray-300 group-hover:text-black transition-colors">
          <ChevronDown v-if="showCustomGroups" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </div>
      </div>
      
      <div v-if="showCustomGroups" class="space-y-2">
        <Draggable 
          v-model="customGroups" 
          v-bind="dragOptions" 
          handle=".handler-group" 
          @end="updateGroupSorting"
          :disabled="!editMode"
          class="space-y-2"
          :class="{'edit-mode-container': editMode}"
        >
          <template #item="{element}">
            <GroupRow 
              :key="element._id" 
              :element="element" 
              :editMode="editMode"
              @edit-group="openEditGroupModal(element)" 
              @select-group="handleSelectGroup(element)"
            />
          </template>
        </Draggable>
        
        <div v-if="customGroups.length === 0" class="px-4 py-8 text-center text-xs font-bold text-gray-300 uppercase tracking-widest">
          No custom groups
        </div>
        
        <!-- Create New Group Button (Inside Custom Groups) -->
        <div v-if="editMode" class="mt-4">
          <button 
            @click="handleCreateNewGroup" 
            class="group w-full px-6 py-3 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex items-center justify-center gap-2 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
          >
            <PlusCircle class="w-3.5 h-3.5" />
            Create Group
          </button>
        </div>
      </div>
    </div>
    
    <!-- Bank Accounts Section -->
    <div class="px-6 py-4 border-t-2 border-gray-50">
      <div 
        class="flex items-center justify-between mb-4 cursor-pointer group"
        @click="toggleBankAccounts"
      >
        <div class="flex items-center gap-2">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Raw Accounts</h2>
          <span class="text-[10px] font-black text-gray-300">{{ bankAccounts.length }}</span>
        </div>
        <div class="text-gray-300 group-hover:text-black transition-colors">
          <ChevronDown v-if="showBankAccounts" class="w-4 h-4" />
          <ChevronRight v-else class="w-4 h-4" />
        </div>
      </div>
      
      <div v-if="showBankAccounts" class="space-y-2">
        <Draggable 
          v-model="bankAccounts" 
          v-bind="dragOptions" 
          handle=".handler-group" 
          @end="updateGroupSorting"
          :disabled="!editMode"
          class="space-y-2"
          :class="{'edit-mode-container': editMode}"
        >
          <template #item="{element}">
            <GroupRow 
              :key="element._id" 
              :element="element" 
              :editMode="editMode"
              @edit-group="openEditGroupModal(element)" 
              @select-group="handleSelectGroup(element)"
            />
          </template>
        </Draggable>
        
        <div v-if="bankAccounts.length === 0" class="px-4 py-8 text-center text-xs font-bold text-gray-300 uppercase tracking-widest">
          No bank accounts
        </div>
      </div>
    </div>

    <!-- Management Actions -->
    <div v-if="!editMode" class="px-6 py-6 border-t-2 border-gray-100 bg-gray-50/30">
      <div class="grid grid-cols-2 gap-3">
        <button 
          @click="goToOnboarding" 
          class="px-4 py-4 bg-white border-2 border-gray-100 hover:border-black rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all flex flex-col items-center justify-center gap-2 text-center"
        >
          <RefreshCw class="w-4 h-4" />
          Re-Sync All
        </button>
        
        <button 
          @click="handleManageBanks" 
          class="px-4 py-4 bg-white border-2 border-gray-100 hover:border-black rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all flex flex-col items-center justify-center gap-2 text-center"
        >
          <Building class="w-4 h-4" />
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
      @banks-data-changed="handleBanksDataChanged"
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
import { ref, onMounted, watch } from 'vue';
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
  },
  editMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const router = useRouter();
const { state } = useDashboardState();
const editingGroup = ref(null);
const { Draggable, dragOptions } = useDraggable();
const { createNewGroup, selectGroup, fetchGroupsAndAccounts, handleGroupChange } = useSelectGroup();

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
  if (!props.editMode) return;
  
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
  if (!props.editMode) return;
  
  const newGroup = await createNewGroup();
  setGroupsAndAccounts();
  openEditGroupModal(newGroup);
}

const handleSelectGroup = (group) => {
  if (props.editMode) return;
  
  emit('close');
  selectGroup(group);
};

// Handle the Manage Banks button click
const handleManageBanks = async () => {  
  // If we have exactly one bank connected, show the sync sessions modal directly
  // if (banks.value.length === 1) {
  //   // Make sure the bank is selected and sync sessions are loaded
  //   selectBank(banks.value[0]);
  //   isSyncSessionsModalOpen.value = true;
  //   return;
  // }
  
  // Otherwise show the regular banks modal
  showBanksModal.value = true;
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

const handleBanksDataChanged = async () => {
  try {
    const { groups, accounts, itemsNeedingReauth } = await fetchGroupsAndAccounts();

    state.itemsNeedingReauth = itemsNeedingReauth || [];
    state.allUserGroups = (groups || []).sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
    state.allUserAccounts = accounts || [];
    setGroupsAndAccounts();

    if (!state.allUserGroups.length || !state.allUserAccounts.length) {
      showBanksModal.value = false;
      emit('close');
      router.push({ name: 'onboarding' });
      return;
    }

    const selectedGroupId = state.selected.group?._id;
    const selectedStillExists = Boolean(
      selectedGroupId && state.allUserGroups.some(group => group._id === selectedGroupId)
    );

    if (!selectedStillExists) {
      await selectGroup(state.allUserGroups[0]);
      return;
    }

    await handleGroupChange();
  } catch (error) {
    console.error('Error refreshing groups and accounts after bank data change:', error);
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

<style scoped>
.edit-mode-container {
  background-color: rgba(219, 234, 254, 0.1); /* Very light blue */
}
</style> 
