<template>
    <div v-if="route.name === 'edit-tab'" class="x-grid middle dottedRow">
      <div @click="select" class="cell-1 p20">
        <div class="x-grid">
          <div class="cell shrink proper">
            {{ sectionName }}
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType===sectionName" />
            <Plus v-else />
          </div>
        </div>
      </div>
    
      <div class="cell-1">
        <RulesRenderer v-if="editState.selectedRuleType===sectionName" :ruleType="sectionName" />
      </div>
    </div>
    </template>
    
    <script setup>
    import { useRoute } from 'vue-router';
    import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
    import { Plus, Minus } from 'lucide-vue-next';
    import RulesRenderer from './RulesRenderer.vue';
    
    const route = useRoute();
    const { state, actions } = useDashboardState();
    
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