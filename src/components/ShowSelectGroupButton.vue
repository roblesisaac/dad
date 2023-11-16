<template>
  <button @click="state.views.push('SelectGroup')" 
    class="acctButton section-content proper" 
    href="#"  v-html="groupName">
  </button>
</template>

<script setup>
import { computed, defineProps } from 'vue';

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