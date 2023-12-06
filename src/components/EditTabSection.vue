<template>
<div v-if="!props.state.is('EditRule')" class="grid middle dottedRow">
  <div @click="props.app.select(props.sectionName)" class="cell-1 p20">
    <div class="grid">
      <div class="cell shrink proper">
        {{ props.sectionName }}
      </div>
      <div class="cell auto right">        
        <Minus v-if="props.editState.selectedRuleType===props.sectionName" />
        <Plus v-else />
      </div>
    </div>
  </div>

  <div class="cell-1">
    <RulesRenderer v-if="props.editState.selectedRuleType===props.sectionName" :ruleType="props.sectionName" :state="props.state" />
  </div>
</div>
</template>

<script setup>
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import RulesRenderer from './RulesRenderer.vue';

const props = defineProps({
  editState: Object,
  state: Object,
  app: Object,
  sectionName: String
});
</script>