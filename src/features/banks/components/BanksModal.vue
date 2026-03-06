<template>
  <BaseModal
    v-if="isOpen"
    :is-open="isOpen"
    title="Connected Banks"
    size="md"
    @close="$emit('close')"
  >
    <template #content>
      <BanksView
        @connect-bank-complete="$emit('connect-bank-complete')"
        @banks-data-changed="$emit('banks-data-changed', $event)"
      />
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

defineEmits(['close', 'connect-bank-complete', 'banks-data-changed']);
</script>
