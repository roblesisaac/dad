<template>
  <div 
    @click="showModal = true" 
    class="h-full px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
  >
    <div class="flex items-center space-x-2">
      <Users class="w-4 h-4 text-indigo-600" />
      <div class="font-bold text-gray-800" v-html="groupName"></div>
    </div>
    
    <div class="flex items-center">
      <div class="font-medium text-indigo-600">
        <NetWorth 
          :accounts="state.selected?.group?.accounts" 
          :state="state" 
          :digits="0" 
        />
      </div>
      <ChevronDown class="w-4 h-4 ml-2 text-gray-500" />
    </div>
    
    <SelectGroupModal 
      :is-open="showModal" 
      @close="showModal = false"
      @group-selected="handleGroupSelected"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useDashboardState } from '../composables/useDashboardState';
import NetWorth from '@/features/select-group/components/NetWorth.vue';
import SelectGroupModal from '@/features/select-group/components/SelectGroupModal.vue';
import { Users, ChevronDown } from 'lucide-vue-next';

const { state } = useDashboardState();
const showModal = ref(false);

const groupName = computed(() => {
  const selectedGroup = state.selected.group;
  return selectedGroup?.name ? 
    `${selectedGroup.name}` 
    : `<span class="text-gray-400">Select Account</span>`;
});

const handleGroupSelected = (group) => {
  // Additional actions after group selection can be handled here
  showModal.value = false;
};
</script>