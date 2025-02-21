<template>
  <div @click="router.push({ name: 'select-group' })" 
    class="acctButton proper pointer bold">
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

<style>
.acctButton {
  height: 50px;
  line-height: 1em;
  padding-top: 10px;
}
</style>