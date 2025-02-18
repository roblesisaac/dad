<template>
  <div @click="state.views.push('SelectGroup')" 
    class="acctButton proper pointer bold">
    <b v-html="groupName"></b>
    <br />
    <small><NetWorth :accounts="state.selected?.group?.accounts" :state="state" :digits="0" /></small>
  </div>
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