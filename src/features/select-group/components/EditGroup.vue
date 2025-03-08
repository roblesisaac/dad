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
      
      <!-- Accounts In Group -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700">Accounts In Group</label>
          <span class="text-xs text-gray-500">{{ props.group.accounts.length }} accounts</span>
        </div>
        
        <div 
          class="min-h-[100px] border border-gray-300 rounded-md p-3 bg-gray-50 transition-colors"
          :class="{'border-indigo-300 bg-indigo-50': props.group.accounts.length > 0}"
        >
          <div v-if="!props.group.accounts.length" class="flex items-center justify-center h-full text-gray-500 text-sm">
            <PlusCircle class="w-4 h-4 mr-2 text-gray-400" />
            Drag accounts here
          </div>
          
          <Draggable 
            class="flex flex-wrap gap-2" 
            group="accountDragger" 
            v-model="props.group.accounts" 
            v-bind="dragOptions(1)"
          >
            <template #item="{element}">
              <div class="px-3 py-1.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-sm font-medium flex items-center">
                <HashIcon class="w-3 h-3 mr-1 text-indigo-500" />
                {{ element.mask }}
              </div>
            </template>
          </Draggable>
        </div>
      </div>
      
      <!-- Accounts Not In Group -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700">Available Accounts</label>
          <span class="text-xs text-gray-500">{{ accountsNotInGroup.length }} accounts</span>
        </div>
        
        <div 
          class="min-h-[100px] border border-gray-300 rounded-md p-3 bg-gray-50"
          :class="{'border-gray-200': accountsNotInGroup.length > 0}"
        >
          <div v-if="!accountsNotInGroup.length" class="flex items-center justify-center h-full text-gray-500 text-sm">
            <CheckCircle class="w-4 h-4 mr-2 text-green-500" />
            All accounts assigned
          </div>
          
          <Draggable 
            class="flex flex-wrap gap-2" 
            group="accountDragger" 
            v-model="accountsNotInGroup" 
            v-bind="dragOptions(1)"
          >
            <template #item="{element}">
              <div class="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-sm font-medium flex items-center">
                <HashIcon class="w-3 h-3 mr-1 text-gray-500" />
                {{ element.mask }}
              </div>
            </template>
          </Draggable>
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
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';
import { HashIcon, Trash2, PlusCircle, CheckCircle } from 'lucide-vue-next';

const { Draggable, dragOptions } = useDraggable();    
const { state } = useDashboardState();
const emit = defineEmits(['close']);

const props = defineProps({
  group: Object
});

const { deleteGroup, updateGroup } = useSelectGroup();

const accountsNotInGroup = computed(() => {
  const accountsInGroup = props.group.accounts.map(account => account._id);

  return state.allUserAccounts.filter(account => {
    return !accountsInGroup.includes(account._id);
  });
});

function handleDeleteGroup() {
  deleteGroup(props.group);
  emit('close');
}

watch(() => props.group, updateGroup, { deep: true });
</script>