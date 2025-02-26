<template>
  <!-- BlueBar -->
  <Transition>
    <div v-if="state.blueBar.message" class="x-grid">
      <div class="cell-1 p10l blue-bar bold">
        <small class="colorBleach">{{ state.blueBar.message }}<LoadingDots v-if="state.blueBar.loading" /></small>
      </div>
    </div>
  </Transition>

  <!-- BackButton -->
  <Transition>
    <button v-if="!isHome" @click="actions.goBack()" class="backButton section b-bottom">
      <ChevronLeft class="icon" /> Back
    </button>
  </Transition>

  <!-- Main Dashboard Content -->
  <template v-if="isHome">
    <!-- Small Screens -->
    <div class="x-grid middle">
      <!-- Selected Group + Date -->
      <div class="cell-1 dateRow b-bottom">
        <div class="x-grid middle">
          <ShowSelectGroupButton class="cell-8-24 b-right" :state="state" />
          <div class="cell-16-24 line50">          
            <DatePickers :state="state" />
          </div>
        </div>
      </div>

      <!-- Scrolling Tabs Totals Row -->
      <div v-if="!state.isLoading" class="cell-1 totalsRow">
        <ScrollingTabButtons :state="state" :app="app" />
      </div>

      <!-- Category Rows -->
      <Transition>
        <div v-if="!state.isLoading && state.selected.tab" class="cell-1">
          <CategoriesWrapper :state="state" />
        </div>
      </Transition>
      <Transition>
        <LoadingDots v-if="state.isLoading"></LoadingDots>
      </Transition>
    </div>
  </template>

  <!-- Router View for Sub-Routes -->
  <router-view v-else></router-view>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ChevronLeft } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';
import { useDashboardState } from '../composables/useDashboardState';
import { usePlaidSync } from '@/shared/composables/usePlaidSync';
import { useApi } from '@/shared/composables/useApi';

// Core Components
import LoadingDots from '@/shared/components/LoadingDots.vue';
import DatePickers from '../components/DatePickers.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
import ScrollingTabButtons from '../components/ScrollingTabButtons.vue';

const router = useRouter();
const route = useRoute();
const api = useApi();
const { stickify } = useAppStore();
const { state, actions } = useDashboardState();
const { syncLatestTransactionsForBanks } = usePlaidSync(api, state);

const isHome = computed(() => route.name === 'dashboard');

onMounted(async () => {
  stickify.register('.totalsRow');
  await actions.init();
  
  // Start syncing transactions for all connected banks
  syncLatestTransactionsForBanks();
});

// Watch route changes
watch(
  () => route.name,
  (newRoute, oldRoute) => {
    if(newRoute === 'dashboard') {
      if(oldRoute === 'select-group') {
        return actions.handleGroupChange();
      }
      setTimeout(actions.processAllTabsForSelectedGroup, 500);
      
      // No longer need to check sync status, the sync progress is tracked by syncLatestTransactionsForBanks
    }
  }
);

watch(() => state.date.start, (_, prevStart) => {
  if(prevStart === 'firstOfMonth') return;
  actions.handleGroupChange();
});

watch(() => state.date.end, (_, prevEnd) => {
  if(prevEnd === 'today') return;
  actions.handleGroupChange();
});

watch(() => state.selected.tab?._id, actions.handleTabChange);
</script>

<style>
.topNav {
  background: #fff;
}

.logoBtn {
  box-shadow: 3px 3px darkgrey;
}

html, body, .divider-text, .tab-button.selected, .allTabRow, .dottedRow,
button.acctButton:hover, button.tab-button:hover, button.view-all:hover, button.linkAccount:hover,
button.acctButton:focus, button.tab-button:focus, button.view-all:focus, button.linkAccount:focus,
button.acctButton:active, button.tab-button:active, button.view-all:active, button.linkAccount:active {
  background: #fff;
}

.acctButton {
  background: lightsteelblue;
}

.backButton {
  background: lightblue;
  width: 100%;
  color: black;
}

.blue-bar {
  background-color: slateblue;
  border-bottom: 2px solid darkblue;
}

.datePickers {
  background: ghostwhite;
}

.view-all {
  background-color: whitesmoke;
}

.logoBtn {
  background-color: #efeff5;
}

.tab-button  {
  background: #efeff5;
}

.count {
  color: mediumblue;
}

.font-color-positive {
  color: darkblue;
}

.font-color-neutral {
  color: #333;
}

.font-color-negative {
  color: darkred;
}

.tab-button.selected {
  z-index: 300;
  box-shadow: 3px 3px #000;
  border-radius: 0;
}

.acctButton, .dp__input_reg, .view-all, .acctButton:hover {
  color: #000
}

.categoryTitle.stickified {
  background: #fff;
  box-shadow: 3px 3px lightblue;
}

.dottedRow {
  border-bottom: 2px dotted #000;
  text-align: left;
  font-weight: bold;
}

.icon {
  color: #333;
  line-height: 1;
}

.line50 {
  line-height: 50px;
}

.panel {
  height: 100vh;
}

.b-right {
  border-right: 2px solid #000;
}

.b-left {
  border-left: 2px solid #000;
}

.b-bottom {
  border-bottom: 2px solid #000;
}

.b-bottom-dashed {
  border-bottom: 2px dotted #000;
}

.b-bottom-none {
  border-bottom: none !important;
}

.b-top {
  border-top: 2px solid #000;
}

.relative {
  position: relative;
}

.totalsRow {
  height: 50px;
  background: #fff;
}

.underline {
  text-decoration: underline;
}
</style>