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
  <button v-if="!state.is(['home'])" @click="app.goBack" class="backButton section b-bottom">
    <ChevronLeft class="icon" /> Back
  </button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="x-grid middle">
    
    <!-- Selected Group + Date -->
    <div class="cell-1 dateRow b-bottom">
      <div class="x-grid middle">

        <!-- Group Selector Button -->
        <ShowSelectGroupButton class="cell-8-24 b-right" :state="state" />

        <!-- Date Pickers -->
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
      <div v-if="!state.isLoading && state.is('home') && state.selected.tab" class="cell-1">
        <CategoriesWrapper :state="state" />
      </div>
    </Transition>
    <Transition>
      <LoadingDots v-if="state.isLoading"></LoadingDots>
    </Transition>
  </div>

  <!-- Not Small Screens -->
  <div v-if="!state.isSmallScreen() && state.is('home')" class="x-grid">

    <!-- Left Side: Account and Date Selector -->
    <div id="leftPanel" class="cell-2-5 b-right panel">
      <!-- Group Selector Button -->
      <ShowSelectGroupButton class="cell-1 b-bottom" :state="state" />

      <!-- Scrolling Tabs -->
      <ScrollingTabButtons v-if="!state.isLoading" class="totalsRow" :state="state" :app="app" />

      <!-- Category Rows -->
      <Transition>
        <CategoriesWrapper v-if="!state.isLoading && state.is('home') && state.selected.tab" :state="state" />
      </Transition>

      <Transition>
        <LoadingDots v-if="state.isLoading"></LoadingDots>
      </Transition>
    </div>

    <!-- Right Side: Date and Selected Category Details List -->
    <div id="rightPanel" class="cell-3-5">
      <!-- Date Pickers -->
      <DatePickers :state="state" class="line50 b-bottom" />

      <!-- Selected Category Details List -->
      <SelectedItems v-if="!state.isLoading && state.selected.tab?.categoryName" :state="state" :categoryName="categoryName" class="p30 text-left" />

      <Transition>
      <div v-if="!state.selected.tab?.categoryName" class="cell-1 panel p30 text-center">        
        <b>« Choose an account and category to see detailed transactions here</b>
      </div>
      </Transition>
    </div>

  </div>

  <!-- SelectGroup -->
  <Transition>
    <SelectGroup v-if="state.is('SelectGroup')" :state="state" :App="app"></SelectGroup>
  </Transition>

  <!-- EditTab -->
  <Transition>
    <EditTab v-if="state.is('EditTab')" :state="state" :App="app"></EditTab>
  </Transition>

  <!-- RuleDetails -->
  <Transition>
    <RuleDetails v-if="state.is('RuleDetails')" :ruleConfig="state.editingRule" :state="state" />
  </Transition>

  <!-- AllTabs -->
  <Transition>
    <div v-if="state.is('AllTabs')" class="cell-1">
      <AllTabs :state="state" :app="app" />
    </div>
  </Transition>

  <!-- ItemRepair -->
  <Transition>
    <div v-if="state.is('ItemRepair')" class="cell-1">
      <ItemRepair :state="state" :app="app" />
    </div>
  </Transition>

  <!-- Show home view when no other view is active -->
  <Transition>
    <div v-if="state.is('home')" class="cell-1">
      <!-- Your home view content -->
    </div>
  </Transition>
</template>

<script setup>
  import { computed, nextTick, onMounted, reactive, watch } from 'vue';
  import AllTabs from '@/features/tabs/components/AllTabs.vue';
  import { ChevronLeft } from 'lucide-vue-next';

  // Components
  import RuleDetails from './components/RuleDetails.vue';
  import SelectedItems from './components/SelectedItems.vue';
  import LoadingDots from '@/shared/components/LoadingDots.vue';
  import ItemRepair from './components/ItemRepair.vue';
  import DatePickers from './components/DatePickers.vue';
  import CategoriesWrapper from './components/CategoriesWrapper.vue';
  import ShowSelectGroupButton from './components/ShowSelectGroupButton.vue';
  import ScrollingTabButtons from './components/ScrollingTabButtons.vue';

  import { useAppStore } from '@/stores/state';
  import { useTransactions } from './composables/useTransactions';
  import { useTabProcessing } from './composables/useTabProcessing';
  import { useSyncStatus } from './composables/useSyncStatus';
  import loadScript from '@/shared/utils/loadScript';
  import { useUtils } from './composables/useUtils';
  import { SelectGroup } from '@/features/select-group';
  import { EditTab } from '@/features/edit-tab';
  import { useApi } from '@/shared/composables/useApi';

  const { State, stickify } = useAppStore();
  const api = useApi();

  // First define state
  const state = reactive({
    allUserAccounts: [],
    allUserGroups: [],
    allUserTabs: [],
    allUserRules: [],
    blueBar: {
      message: false,
      loading: false
    },
    date: { start: 'firstOfMonth', end: 'today' },
    dragOptions: (delayMs=0) => ({
      animation: 200,
      delay: delayMs,
      touchStartThreshold: 100
    }),
    editingRule: null,
    editingGroup: null,
    elems: {
      body: document.documentElement.style
    },
    isLoading: true,
    is(view) {
      if (view === 'home') {
        return this.views.length === 0;
      }
      return this.views[this.views.length - 1] === view;
    },
    isSmallScreen: () => State.currentScreenSize() === 'small',
    linkToken: null,
    showReorder: false,
    selected: {
      allGroupTransactions: [],
      group: computed(() => state.allUserGroups.find(group => group.isSelected) ),
      tabsForGroup: computed({
        get: () => {
          const selectedGroup = state.selected.group;

          if(!selectedGroup) {
            return [];
          }

          const tabs = state.allUserTabs.filter(tab => {
            const tabMatchesGroupId = tab.showForGroup.includes(selectedGroup._id);
            const tabIsGlobal = tab.showForGroup.includes('_GLOBAL');

            return tabMatchesGroupId || tabIsGlobal;
          });

          return tabs.sort((a,b) => a.sort - b.sort);
        },
        set: (reorderedTabs) => {
          reorderedTabs.forEach((tab, newTabIndex) => tab.sort = newTabIndex);
        }
      }),
      tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected) ),
      transaction: false
    },
    syncCheckId: false,
    views: [],
    currentView: computed(() => state.views[state.views.length - 1] || 'home'),
    view: computed(() => state.views[state.views.length -1])
  });

  // Then initialize composables with state
  const { fetchTransactions, fetchUserTabs, fetchUserRules } = useTransactions(api);
  const { processTabData } = useTabProcessing();
  const { checkSyncStatus } = useSyncStatus(api, state);

  // Initialize utils
  const { 
    sortBy, 
    extractDateRange, 
    selectFirstGroup,
    selectFirstTab,
    selectedTabsInGroup,
    deselectOtherTabs 
  } = useUtils();

  onMounted(() => {
    stickify.register('.totalsRow');
  });

  const app = function() {
    // Simplified app object that uses composables
    return {
      checkSyncStatus,
      createNewTab: async () => {
        if(location.pathname !== '/spendingreport') {
          return;
        }

        const tabsForGroup = state.selected.tabsForGroup;
        let tabName = `Tab ${tabsForGroup.length+1}`;

        const response = prompt('What would you like to name this tab?', tabName)

        if(!response) {
          return;
        }

        tabName = response;

        if(!state.selected.group) {
          return;
        }

        const selectedGroup = state.selected.group;
        const selectedTab = state.selected.tab;

        if(selectedTab) {
          selectedTab.isSelected = false;
          api.put(`tabs/${selectedTab._id}`, { isSelected: false });
        }

        const newTab = await api.post('tabs', {
          tabName,
          showForGroup: [selectedGroup._id],
          isSelected: true,
          sort: tabsForGroup.length+1
        });

        state.allUserTabs.push(newTab);
        await app.processAllTabsForSelectedGroup();
      },
      goBack: () => {
        state.isLoading = true;
        if(state.views.length > 1) state.views.pop();
      },
      init: async () => {
        try {
          state.blueBar.message = 'Beginning sync';
          state.blueBar.loading = true;

          await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

          try {
            state.allUserTabs = await fetchUserTabs();       
            state.allUserRules = await fetchUserRules();
          } catch (error) {
            console.error('Error fetching tabs/rules:', error);
          }
          
          try {
            const { groups, accounts } = await api.get('/plaid/sync/accounts/and/groups');
            
            state.allUserAccounts = accounts;
            state.allUserGroups = groups?.sort(sortBy('sort')) || [];

          } catch (error) {
            console.error('Account sync error:', error);
            
            // Get error details from response
            const errorData = error.response?.data;
            const errorStatus = error.response?.status;
            
            console.log('Error details:', { errorData, errorStatus });

            // Handle both 400 and 500 errors
            if (errorData?.error === 'NO_ITEMS' || errorData?.message?.includes('No Plaid items found')) {
              console.log('NO_ITEMS error detected, switching to ItemRepair view');
              state.blueBar.message = 'Welcome! Let\'s connect your first bank account.';
              state.blueBar.loading = false;
              
              // Force view update
              state.views = [];
              await nextTick();  // Wait for views array to update
              state.views.push('ItemRepair');
              console.log('Views after update:', state.views);
              
              // Double check view update
              if (!state.is('ItemRepair')) {
                console.warn('View not updated correctly, forcing update');
                state.views = ['ItemRepair'];
              }
              return;
            }

            // Handle other errors
            state.blueBar.message = errorData?.message || 'There was an error connecting to your accounts. Please try again.';
            state.blueBar.loading = false;
          }
        } catch (error) {
          console.error('Init error:', error);
          state.blueBar.message = 'Unable to initialize application. Please refresh the page.';
        } finally {
          state.blueBar.loading = false;
        }
      },
      handleGroupChange: async () => {
        let selectedGroup = state.selected.group;
        const tabsForGroup = state.selected.tabsForGroup;

        if(state.date.start > state.date.end) {
          return;
        }

        if(!selectedGroup) {
          if(!state.allUserGroups.length) {
            state.views.push('SelectGroup');
            return;
          }

          selectedGroup = selectFirstGroup(state, api);
        }

        state.isLoading = true;
        state.selected.allGroupTransactions = [];

        for(const account of selectedGroup.accounts) {
          state.selected.allGroupTransactions = [
            ...state.selected.allGroupTransactions,
            ...await fetchTransactions(account.account_id, extractDateRange(state))
          ]
        };

        if(!!tabsForGroup.length) {
          return await app.processAllTabsForSelectedGroup();
        }
 
        nextTick(async () => {
          await app.createNewTab();
          state.isLoading = false;
        });
      },
      handleTabChange: (newSelectedTabId, oldSelectedTabId) => {
        if (newSelectedTabId === oldSelectedTabId) {
          return;
        }

        if(oldSelectedTabId) {
          const oldSelectedTab = state.allUserTabs?.find(({ _id }) => _id === oldSelectedTabId);
          if (oldSelectedTab) {
            oldSelectedTab.categorizedItems = [];
          }
        }

        if(!newSelectedTabId) {
          return;
        }
        
        const selectedTab = state.selected.tab;
        if (!selectedTab) return;

        const processed = processTabData(state.selected.allGroupTransactions, selectedTab, state.allUserRules);
        if (processed) {
          selectedTab.categorizedItems = processed.categorizedItems;
        }
      },
      handleViewChange: async (newView, oldView) => {
        if(newView !== 'home') {
          return;
        }

        if(oldView === 'SelectGroup') {
          return app.handleGroupChange();
        }

        setTimeout(app.processAllTabsForSelectedGroup, 500);
      },
      processAllTabsForSelectedGroup: async () => {
        const tabsForGroup = state.selected.tabsForGroup;

        if(!tabsForGroup?.length) {
          return;
        }

        state.isLoading = true;

        const selectedTabs = selectedTabsInGroup(tabsForGroup);

        if(selectedTabs.length < 1) {
          selectFirstTab(tabsForGroup, api);
        }

        if(selectedTabs.length > 1) {
          await deselectOtherTabs(selectedTabs, api);
        }

        for(const tab of tabsForGroup) {
          tab.categorizedItems = [];

          const processed = processTabData(state.selected.allGroupTransactions, tab, state.allUserRules);

          if (processed) {
            tab.total = processed.tabTotal;
            tab.categorizedItems = processed.categorizedItems;
          }
        }

        state.isLoading = false;
      },
      processTabData
    }
  }();

  app.init();

  watch(() => state.date.start, (_, prevStart) => {
    if(prevStart === 'firstOfMonth') {  
      return;
    }

    app.handleGroupChange();
  });

  watch(() => state.date.end, (_, prevEnd) => {
    if(prevEnd === 'today') {
      return;
    }

    app.handleGroupChange();
  });
  
  watch(() => state.views, (newViews, oldViews) => {
    console.log('Views changed:', { 
      old: oldViews, 
      new: newViews, 
      currentView: state.is('ItemRepair') ? 'ItemRepair' : 'home' 
    });
  }, { deep: true, immediate: true });

  watch(() => state.views[state.views.length - 1], (newView, oldView) => {
    console.log('Current view changed:', { newView, oldView });
    app.handleViewChange(newView, oldView);
  });

  watch(() => state.selected.tab?._id, app.handleTabChange);

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