<template>
  <div class="text-left">
    <!-- Group Form -->
    <div class="space-y-6">
      <!-- Group Name -->
      <div>
        <label for="group-name" class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
        <input 
          type="text" 
          id="group-name"
          v-model="props.group.name" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter group name" 
        />
      </div>
      
      <!-- Group Info (Description) -->
      <div>
        <label for="group-info" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea 
          id="group-info"
          v-model="props.group.info" 
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Add optional description"
        ></textarea>
      </div>
      
      <!-- Accounts In Group Section -->
      <div class="border border-gray-200 rounded-md shadow-sm">
        <div class="border-b border-gray-200 px-4 py-3 bg-indigo-50">
          <h2 class="font-medium text-indigo-800">Accounts In Group ({{ props.group.accounts.length }})</h2>
        </div>
        
        <div v-if="props.group.accounts.length > 0" class="p-4">
          <div v-for="account in props.group.accounts" :key="account._id" class="flex items-center justify-between p-2 mb-2 border border-gray-200 rounded-md">
            <div class="flex items-center">
              <HashIcon class="w-4 h-4 mr-2 text-indigo-500" />
              <span class="text-sm font-medium">{{ account.mask }}</span>
            </div>
            <Switch 
              :model-value="true" 
              @update:model-value="toggleAccountInGroup(account)" 
            />
          </div>
        </div>
        
        <div v-else class="px-4 py-6 text-center text-gray-500 italic">
          No accounts in this group
        </div>
      </div>
      
      <!-- Available Accounts Section -->
      <div class="border border-gray-200 rounded-md shadow-sm">
        <div 
          @click="toggleAvailableAccounts" 
          class="flex items-center justify-between px-4 py-3 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
        >
          <h2 class="font-medium text-gray-700">Available Accounts ({{ accountsNotInGroup.length }})</h2>
          <div class="text-gray-500">
            <ChevronDown v-if="showAvailableAccounts" class="w-5 h-5" />
            <ChevronRight v-else class="w-5 h-5" />
          </div>
        </div>
        
        <div v-if="showAvailableAccounts">
          <div v-if="accountsNotInGroup.length > 0" class="p-4">
            <div v-for="account in accountsNotInGroup" :key="account._id" class="flex items-center justify-between p-2 mb-2 border border-gray-200 rounded-md">
              <div class="flex items-center">
                <HashIcon class="w-4 h-4 mr-2 text-gray-500" />
                <span class="text-sm font-medium">{{ account.mask }}</span>
              </div>
              <Switch 
                :model-value="false" 
                @update:model-value="toggleAccountInGroup(account)" 
              />
            </div>
          </div>
          
          <div v-else class="px-4 py-6 text-center text-gray-500 italic">
            <CheckCircle class="w-4 h-4 mx-auto mb-2 text-green-500" />
            All accounts assigned
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="pt-4 flex justify-between">
        <button 
          @click="emit('close')" 
          class="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        
        <button 
          @click="handleDeleteGroup" 
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 class="w-4 h-4 mr-1 inline-block" />
          Delete Group
        </button>
      </div>
    </div>
  </div>
</template>
    
<script setup>
import { computed, watch, ref } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { HashIcon, Trash2, CheckCircle, ChevronDown, ChevronRight } from 'lucide-vue-next';
import Switch from '@/shared/components/Switch.vue';

const { state } = useDashboardState();
const emit = defineEmits(['close']);

const props = defineProps({
  group: Object
});

const { deleteGroup, updateGroup } = useSelectGroup();

// State for the available accounts section
const showAvailableAccounts = ref(false);

const accountsNotInGroup = computed(() => {
  const accountsInGroup = props.group.accounts.map(account => account._id);

  return state.allUserAccounts.filter(account => {
    return !accountsInGroup.includes(account._id);
  });
});

function toggleAvailableAccounts() {
  showAvailableAccounts.value = !showAvailableAccounts.value;
}

function toggleAccountInGroup(account) {
  // Find if the account is already in the group
  const isInGroup = props.group.accounts.some(groupAccount => groupAccount._id === account._id);
  
  if (isInGroup) {
    // Remove account from group
    props.group.accounts = props.group.accounts.filter(groupAccount => groupAccount._id !== account._id);
  } else {
    // Add account to group
    props.group.accounts.push(account);
  }
}

function handleDeleteGroup() {
  const deletedGroup = deleteGroup(props.group);

  if(deletedGroup) {
    emit('delete-group');
  }
}

watch(() => props.group, updateGroup, { deep: true });
</script>