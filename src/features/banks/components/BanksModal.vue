<template>
  <BaseModal
    v-if="isOpen"
    :is-open="isOpen"
    title="Manage Connected Banks"
    size="xl"
    @close="$emit('close')"
  >
    <template #content>
      <BanksView @connect-bank-complete="$emit('connect-bank-complete')" />
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/shared/components/BaseModal.vue';
import BanksView from '../views/BanksView.vue';

defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
});

defineEmits(['close', 'connect-bank-complete']);
</script> 