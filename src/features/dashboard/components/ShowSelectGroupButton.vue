<template>
  <div @click="router.push({ name: 'select-group' })" 
    class="h-full px-4 py-2 flex items-center justify-between cursor-pointer">
    <div class="text-base font-bold" v-html="groupName"></div>
    <div class="font-medium ml-2"><NetWorth :accounts="state.selected?.group?.accounts" :state="state" :digits="0" /></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState';
import NetWorth from '@/features/select-group/components/NetWorth.vue';

const router = useRouter();
const { state } = useDashboardState();

const groupName = computed(() => {
  const selectedGroup = state.selected.group;
  return selectedGroup?.name ? 
    `${selectedGroup.name}` 
    : `<span class="underline">Account</span>`;
});
</script>