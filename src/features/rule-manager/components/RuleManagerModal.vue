<template>
  <BaseModal 
    :is-open="isOpen" 
    size="xl"
    title="Manage tab rules"
    @close="closeModal"
  >
    <template #content>
      <RuleManager />
    </template>
  </BaseModal>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import RuleManager from '@/features/rule-manager/views/RuleManager.vue';

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