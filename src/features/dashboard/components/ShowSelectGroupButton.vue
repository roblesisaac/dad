<template>
  <button 
    @click="state.views.push('SelectGroup')" 
    class="w-full h-[50px] bg-blue-50 hover:bg-blue-100 text-gray-900 transition-colors py-2 cursor-pointer"
  >
    <div class="font-medium capitalize">
      <span v-html="groupName"></span>
    </div>
    <div class="text-sm text-blue-600">
      <NetWorth :accounts="state.selected?.group?.accounts" :state="state" :digits="0" />
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import NetWorth from '@/features/select-group/components/NetWorth.vue';

const props = defineProps({
  state: Object
});

const groupName = computed(() => {
  const selectedGroup = props.state.selected.group;
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