<template>
  <div @click="selectTab(props.tab)" :class="['grid middle', borders]">
    <div v-if="tab.isSelected" class="cell-1-5">
      <DotsVerticalCircleOutline />
    </div>
    <div class="cell auto">
      <div class="relative pointer">
        <small class="section-title">
          {{ props.tab.tabName }}
        </small>
        <br/>
        <LoadingDots v-if="props.state.isLoading" />
        <span v-else href="#" class="section-content">{{ tabTotal }}</span>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed } from 'vue';
import LoadingDots from './LoadingDots.vue';
import DotsVerticalCircleOutline from 'vue-material-design-icons/DotsVerticalCircleOutline.vue';
import { formatPrice } from '../utils';
import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const props = defineProps({
  tab: 'object',
  state: 'object',
  tabIndex: Number
});

const tabsForGroup = props.state.selected.tabsForGroup;

const isSelected = computed(() => {
  return props.tab.isSelected;
});

const borders = computed(() => {
  const rightBorder = isLastInArray.value || isSelected.value ? '' : 'b-right';
  const bottomBorder = isSelected.value ? 'b-bottom-dashed' : 'b-bottom';
  const borderLeft = isPreviousTabSelected.value ? 'b-left' : '';

  return ['section', bottomBorder, rightBorder, borderLeft];
});

const tabTotal = computed(() => {
  const total = props.tab.total || 0;
  const toFixed = isSelected.value ? 2 : 0;

  return formatPrice(total, { toFixed });
});

const isLastInArray = computed(() => props.tabIndex === tabsForGroup.length - 1);

const isPreviousTabSelected = computed(() => {
  const previousTab = tabsForGroup[props.tabIndex-1];

  return previousTab?.isSelected;
});

async function selectTab(tabToSelect) {
  if(tabToSelect.isSelected) {
    return props.state.view = 'EditTab';
  }

  const currentlySelectedTab = props.state.selected.tab;

  if(currentlySelectedTab) {
    currentlySelectedTab.isSelected = false;
    await api.put(`api/tabs/${currentlySelectedTab._id}`, { isSelected: false });
  }

  tabToSelect.isSelected = true;
  await api.put(`api/tabs/${tabToSelect._id}`, { isSelected: true });
}

</script>

<style>
/* .tabButton.isSelected {
  background: #d3e3fe;
} */
</style>