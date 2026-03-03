<template>
  <div class="text-left w-full">
    <!-- Group Form -->
    <div class="space-y-8">
      <!-- Group Name -->
      <div class="px-6">
        <label for="group-name" class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nickname</label>
        <input 
          type="text" 
          id="group-name"
          v-model="props.group.name" 
          class="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-black tracking-tight placeholder:text-gray-200 focus:outline-none focus:border-black transition-all"
          placeholder="Enter group name" 
        />
      </div>
      
      <!-- Group Info (Description) -->
      <div class="px-6">
        <label for="group-info" class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Description</label>
        <textarea 
          id="group-info"
          v-model="props.group.info" 
          rows="2"
          class="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-black tracking-tight placeholder:text-gray-200 focus:outline-none focus:border-black transition-all resize-none"
          placeholder="Add optional description"
        ></textarea>
      </div>
      
      <!-- Accounts In Group Section -->
      <div class="border-t-2 border-gray-50 pt-8">
        <div class="px-6 mb-4 flex items-center justify-between">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Accounts In Group</h2>
          <span class="text-[10px] font-black text-black">{{ props.group.accounts.length }} assigned</span>
        </div>
        
        <div v-if="props.group.accounts.length > 0">
          <div 
            v-for="account in props.group.accounts" 
            :key="account._id" 
            class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
          >
            <div class="flex flex-col">
              <span class="text-base font-black text-gray-900 tracking-tight">{{ account.officialName || account.name }}</span>
              <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
            </div>
            <Switch 
              :model-value="true" 
              :id="`acc-in-${account._id}`"
              @update:model-value="toggleAccountInGroup(account)" 
            />
          </div>
        </div>
        
        <div v-else class="px-6 py-8 text-center text-[10px] font-black uppercase tracking-widest text-black">
          No accounts in this group
        </div>
      </div>
      
      <!-- Available Accounts Section -->
      <div class="border-t-2 border-gray-50 pt-4">
        <button 
          @click="toggleAvailableAccounts" 
          class="flex items-center justify-between w-full px-6 py-4 hover:bg-gray-50/50 transition-all group focus:outline-none"
        >
          <div class="flex items-center gap-2">
            <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Available Accounts</h2>
            <span class="text-[10px] font-black text-black">{{ accountsNotInGroup.length }}</span>
          </div>
          <div class="text-gray-200 group-hover:text-black transition-colors">
            <ChevronDown v-if="showAvailableAccounts" class="w-4 h-4" />
            <ChevronRight v-else class="w-4 h-4" />
          </div>
        </button>
        
        <div v-if="showAvailableAccounts" class="pb-4">
          <div v-if="accountsNotInGroup.length > 0">
            <div 
              v-for="account in accountsNotInGroup" 
              :key="account._id" 
              class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors group"
            >
              <div class="flex flex-col">
                <span class="text-base font-black text-gray-900 tracking-tight">{{ account.officialName || account.name }}</span>
                <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
              </div>
              <Switch 
                :model-value="false" 
                :id="`acc-avail-${account._id}`"
                @update:model-value="toggleAccountInGroup(account)" 
              />
            </div>
          </div>
          
          <div v-else class="px-6 py-8 text-center text-[10px] font-black uppercase tracking-widest text-black">
            All accounts assigned
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
        <button 
          @click="emit('close')" 
          class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
        >
          Cancel
        </button>
        
        <button 
          @click="handleDeleteGroup" 
          class="px-6 py-4 bg-red-50 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Delete
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