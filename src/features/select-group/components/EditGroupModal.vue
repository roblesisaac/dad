<template>
  <BaseModal
    v-if="isOpen"
    :is-open="isOpen"
    title="Edit Group"
    size="lg"
    @close="$emit('close')"
  >
    <template #content>
      <EditGroup 
        :group="group" 
        @close="$emit('close')"
        @delete-group="$emit('delete-group', $event)"
      />
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/shared/components/BaseModal.vue';
import EditGroup from './EditGroup.vue';

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  group: {
    type: Object,
    default: null
  }
});

defineEmits(['close', 'delete-group']);
</script> 