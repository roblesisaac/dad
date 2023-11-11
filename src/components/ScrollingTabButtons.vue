<template>
<ScrollingContent>
  <TabButton v-for="(tab, tabIndex) in props.state.selected.tabsForGroup"  
    :state="state" 
    :tab="tab" 
    :key="tabIndex" 
    :tabIndex="tabIndex" 
    class="reportTab"
  />
  <div @click="props.app.createNewTab()" class="reportTab bold b-bottom b-left line50">
    + Tab
  </div>
</ScrollingContent>
</template>

<script setup>
import TabButton from './TabButton.vue';
import ScrollingContent from './ScrollingContent.vue';

const props = defineProps({
  app: Object,
  state: Object
});

</script>