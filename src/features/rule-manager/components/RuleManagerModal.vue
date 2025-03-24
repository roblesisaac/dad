<template>
  <BaseModal 
    :is-open="isOpen" 
    size="xl"
    :title="`Manage rules for ${state.selected.tab?.tabName || 'Tab'}`"
    @close="closeModal"
    :content-padding="false"
  >
    <template #content>
      <RuleManager @close="closeModal" v-bind="$attrs" />
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
  }
});

const emit = defineEmits(['close']);

// Close modal handler
const closeModal = () => {
  emit('close');
};
</script> 