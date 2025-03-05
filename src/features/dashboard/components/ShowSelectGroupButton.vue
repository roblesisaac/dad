<template>
  <div @click="router.push({ name: 'select-group' })" 
    class="h-[50px] pl-5 leading-none pt-2.5 font-bold cursor-pointer">
    <b v-html="groupName"></b>
    <br />
    <small><NetWorth :accounts="state.selected?.group?.accounts" :state="state" :digits="0" /></small>
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