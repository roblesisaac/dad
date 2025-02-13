<template>
  <div class="flex items-center justify-between p-2.5 border-b border-gray-200 hover:bg-gray-50">
    <!-- Menu Icon -->
    <div class="w-8">
      <MoreVertical class="text-gray-500 hover:text-gray-700" />
    </div>

    <!-- Title & Total -->
    <div class="flex-1 cursor-pointer" @click="selectTab(element)">
      <div class="font-semibold capitalize">{{ element.tabName }}</div>
      <div class="text-blue-600 font-semibold">{{ tabTotal(element) }}</div>
    </div>

    <!-- Drag Handle -->
    <div class="w-8">
      <GripHorizontal class="handlerTab cursor-move text-gray-400 hover:text-gray-600" />
    </div>
  </div>
</template>

<script setup>
import { nextTick, watch } from 'vue';
import { formatPrice } from '@/utils';
import { MoreVertical, GripHorizontal } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

const props = defineProps({
  app: Object,
  state: Object,
  element: Object
});

function selectTab(tabToSelect) {
  if(tabToSelect.isSelected) {
    props.app.goBack();
    return;
  }

  const currentlySelectedTab = props.state.selected.tab;

  if(currentlySelectedTab) {
    currentlySelectedTab.isSelected = false;
    api.put(`api/tabs/${currentlySelectedTab._id}`, { isSelected: false });
  }

  tabToSelect.isSelected = true;
  api.put(`api/tabs/${tabToSelect._id}`, { isSelected: true });

  nextTick(() => {
    props.app.goBack();
  });
}

function tabTotal(tab) {
  const total = tab.total || 0;
  const toFixed = tab.isSelected ? 2 : 0;

  return formatPrice(total, { toFixed });
}

watch(() => props.element.sort, (newSort) => {
  api.put(`api/tabs/${props.element._id}`, { sort: newSort });
});
</script>