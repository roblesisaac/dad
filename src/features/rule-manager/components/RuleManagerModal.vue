<template>
  <BaseModal 
    :is-open="isOpen" 
    size="xl"
    :content-padding="false"
    :show-close-button="false"
    :hide-header="true"
    @close="closeModal"
  >
    <template #content>
      <RuleManager
        :section="initialSection"
        :open-custom-rule-editor="openCustomRuleEditor"
        @close="closeModal"
      />
    </template>
  </BaseModal>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import RuleManager from '@/features/rule-manager/views/RuleManager.vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';

const { state } = useDashboardState();

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialSection: {
    type: String,
    default: null
  },
  openCustomRuleEditor: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

// Close modal handler
const closeModal = () => {
  emit('close');
};
</script> 
