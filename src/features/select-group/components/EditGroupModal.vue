<template>
  <BaseModal
    v-if="isOpen"
    :is-open="isOpen"
    size="md"
    @close="$emit('close')"
  >
    <template #header>
      <div class="px-6 py-6 border-b-2 border-gray-50 flex items-center justify-between">
        <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Edit Group</h2>
        <button 
          @click="$emit('close')"
          class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-black focus:outline-none"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </template>

    <template #content>
      <div class="py-2">
        <EditGroup 
          :group="group" 
          @close="$emit('close')"
          @delete-group="$emit('delete-group', $event)"
        />
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/shared/components/BaseModal.vue';
import EditGroup from './EditGroup.vue';
import { X } from 'lucide-vue-next';

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