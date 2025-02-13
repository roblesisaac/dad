<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Tab Name -->
    <div v-if="!state.is('EditRule')" class="border-b border-gray-200">
      <div class="grid grid-cols-5 items-center">
        <div class="col-span-1 py-4 px-6 font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
          <span class="text-sm">Name</span>
        </div>
        <div class="col-span-4 px-6">
          <input 
            v-model="editState.changeTabNameTo" 
            class="w-full px-0 py-2 bg-transparent border-0 focus:ring-0 text-blue-600 font-medium"
            type="text" 
          />
        </div>
      </div>
    </div>

    <!-- Rule Sections -->
    <EditTabSection 
      v-for="section in ['sort', 'categorize', 'filter', 'groupBy']"
      :key="section"
      :editState="editState" 
      :state="state" 
      :app="app" 
      :sectionName="section" 
    />

    <!-- Share Section -->
    <ShareSection 
      :editState="editState" 
      :state="state" 
      :app="app" 
    />

    <!-- Action Buttons -->
    <ActionButtons 
      v-if="!state.is('EditRule')" 
      :app="app" 
    />
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue';
import { useEditTab } from './composables/useEditTab';
import EditTabSection from './components/EditTabSection.vue';
import ShareSection from './components/ShareSection.vue';
import ActionButtons from './components/ActionButtons.vue';

const props = defineProps({
  state: Object,
  App: Object
});

const selectedTab = computed(() => props.state.selected.tab);

const editState = reactive({
  changeTabNameTo: selectedTab.value.tabName,
  ruleDetails: null,
  selectedRuleType: '',
  typingTimer: 0
});

const { app } = useEditTab(props.state, editState, props.App);

watch(() => editState.changeTabNameTo, app.changeTabName);
watch(() => selectedTab.value.showForGroup, app.saveGroups, { deep: true });
</script>

<style>
.draggable {
  @apply min-h-[50px] w-full;
}

.dropHere {
  @apply p-4 border-2 border-dashed border-gray-300 min-h-[50px] rounded-lg bg-gray-50;
}

.sharedWith {
  @apply bg-gray-800 text-white px-4 py-2 rounded-md mr-4 mb-4 hover:bg-gray-700 transition-colors;
}

.transparent {
  @apply border-0 bg-transparent shadow-none focus:outline-none focus:ring-0;
}

.uniqueBtn {
  @apply bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition-colors;
}
</style> 