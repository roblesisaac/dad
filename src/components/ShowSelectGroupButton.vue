<template>
  <div @click="state.views.push('SelectGroup')" 
    class="acctButton section-content proper pointer bold">
    <b v-html="groupName"></b>
    <!-- <br />
    <small>{{ props.state.selected?.group?.totalAvailableBalance }}</small> -->
  </div>
</template>

<script setup>
import { computed } from 'vue';

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