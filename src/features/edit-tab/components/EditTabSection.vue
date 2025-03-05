<template>
    <div v-if="route.name === 'edit-tab'" class="mb-3 border-2 border-gray-800 rounded shadow-[3px_3px_0px_#000] overflow-hidden">
      <!-- Section Header -->
      <div 
        @click="select" 
        class="flex items-center justify-between py-3 px-4 cursor-pointer transition-colors duration-200"
        :class="{
          'bg-teal-100 border-b-2 border-teal-700': sectionName === 'categorize' && editState.selectedRuleType === sectionName,
          'bg-cyan-100 border-b-2 border-cyan-700': sectionName === 'sort' && editState.selectedRuleType === sectionName,
          'bg-amber-100 border-b-2 border-amber-700': sectionName === 'filter' && editState.selectedRuleType === sectionName,
          'bg-indigo-100 border-b-2 border-indigo-700': !['categorize', 'sort', 'filter'].includes(sectionName) && editState.selectedRuleType === sectionName,
          'hover:bg-gray-100': editState.selectedRuleType !== sectionName,
          'border-b border-gray-300': editState.selectedRuleType !== sectionName
        }"
      >
        <!-- Section Title -->
        <div class="flex items-center">
          <div class="w-2 h-8 mr-3 rounded"
            :class="{
              'bg-teal-700': sectionName === 'categorize',
              'bg-cyan-700': sectionName === 'sort',
              'bg-amber-700': sectionName === 'filter',
              'bg-indigo-700': !['categorize', 'sort', 'filter'].includes(sectionName)
            }"
          ></div>
          <span class="font-bold tracking-wider text-lg capitalize"
            :class="{
              'text-teal-800': sectionName === 'categorize',
              'text-cyan-800': sectionName === 'sort',
              'text-amber-800': sectionName === 'filter',
              'text-indigo-800': !['categorize', 'sort', 'filter'].includes(sectionName)
            }"
          >{{ sectionName }}</span>
        </div>
        
        <!-- Icon -->
        <div class="flex items-center justify-center w-8 h-8 rounded-full">        
          <Minus v-if="editState.selectedRuleType===sectionName" class="text-pink-600 w-5 h-5" />
          <Plus v-else class="text-green-600 w-5 h-5" />
        </div>
      </div>

      <!-- Rules Content -->
      <div>
        <RulesRenderer v-if="editState.selectedRuleType===sectionName" :ruleType="sectionName" />
      </div>
    </div>
    </template>
    
    <script setup>
    import { useRoute } from 'vue-router';
    import { Plus, Minus } from 'lucide-vue-next';
    import RulesRenderer from './RulesRenderer.vue';
    
    const route = useRoute();
    
    const props = defineProps({
      editState: Object,
      sectionName: String
    });
    
    function select() {
      props.editState.selectedRuleType = props.editState.selectedRuleType === props.sectionName 
        ? '' 
        : props.sectionName;
    }
    </script>