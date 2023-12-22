<template>
  <!-- BlueBar -->
  <Transition>
  <div v-if="state.blueBar.message" class="grid">
    <div class="cell-1 p10l blue-bar bold">
      <small class="colorBleach">{{ state.blueBar.message }}<LoadingDots v-if="state.blueBar.loading" /></small>
    </div>
  </div>
  </Transition>

  <!-- BackButton -->
  <Transition>
  <button v-if="!state.is(['home'])" @click="app.goBack" class="acctButton section b-bottom">
    <ChevronLeft class="icon" /> Back
  </button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    
    <!-- Selected Group + Date -->
    <div class="cell-1 dateRow">
      <div class="grid middle">

        <!-- Group Selector Button -->
        <div class="cell-8-24 section b-bottom b-right line50">
          <ShowSelectGroupButton :state="state" />
        </div>

        <!-- Date Pickers -->
        <div class="cell-16-24 section line50">          
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
  <div v-if="!state.isSmallScreen() && state.is('home')" class="grid">

    <!-- Left Side: Account and Date Selector -->
    <div id="leftPanel" class="cell-2-5 b-right panel">
      <!-- Group Selector Button -->
      <ShowSelectGroupButton  class="cell-1 section b-bottom line50" :state="state" />

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

    <!-- Edit Group -->
  <Transition>
    <div v-if="state.is('EditGroup')" class="cell-1">
      <EditGroup :state="state" />
    </div>
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
</template>

<script setup>
  import { computed, nextTick, onMounted, reactive, watch } from 'vue';
  import AllTabs from '../components/AllTabs.vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  import ItemRepair from '../components/ItemRepair.vue';
  import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import SelectGroup from '../components/SelectGroup.vue';
  import DatePickers from '../components/DatePickers.vue';
  import ScrollingTabButtons from '../components/ScrollingTabButtons.vue';
  import EditTab from '../components/EditTab.vue';
  import CategoriesWrapper from '../components/CategoriesWrapper.vue'; 
  import RuleDetails from '../components/RuleDetails.vue';
  import EditGroup from '../components/EditGroup.vue';
  import SelectedItems from '../components/SelectedItems.vue';
  import { useAppStore } from '../stores/state';

  const { api, State, stickify } = useAppStore();

  onMounted(() => {
    stickify.register('.totalsRow');
  });

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
      const views = Array.isArray(view) ? view : [view];
      return views.includes(state.view);
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
    showStayLoggedIn: false,
    syncCheckId: false,
    views: ['home'],
    view: computed(() => state.views[state.views.length -1])
  });

  const app = function() {
    const months = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const ruleMethods = {
      '>=': (itemValue, valueToCheck) => parseFloat(itemValue) >= parseFloat(valueToCheck),
      '>': (itemValue, valueToCheck) => parseFloat(itemValue) > parseFloat(valueToCheck),
      '=': equals,
      'is not': (itemValue, valueToCheck) => {
        return !equals(itemValue, valueToCheck);
      },
      '<=': (itemValue, valueToCheck) => parseFloat(itemValue) <= parseFloat(valueToCheck),
      '<': (itemValue, valueToCheck) => parseFloat(itemValue) < parseFloat(valueToCheck),
      includes,
      excludes: function(itemValue, valueToCheck) {
        return !includes(itemValue, valueToCheck)
      }
    };

    function buildRuleMethods(tabRules) {
      const [ sorters, categorizers, filters, propToGroupBy ] = extractAndSortRuleTypes(tabRules);

      const sort = (arrayToSort) => {
        const arrayCopy = arrayToSort.map(item => (JSON.parse(JSON.stringify(item))));

        if(!sorters.length) sorters.push({ itemPropName: '-date' });

        for(const { itemPropName } of sorters) {
          const isInReverse = itemPropName.startsWith('-');
          const propName = isInReverse ? itemPropName.slice(1) : itemPropName;
          
          arrayCopy.sort((a, b) => {
            const valueA = propName === 'date' ? new Date(a[propName]) : a[propName];
            const valueB = propName === 'date' ? new Date(b[propName]) : a[propName];

            return isInReverse ? valueB - valueA : valueA - valueB;
          });
        }

        return arrayCopy;
      };

      const categorize = (item) => {
        if(item.recategorizeAs) {
          let recategory = String(item.recategorizeAs).trim().toLowerCase();

          item.personal_finance_category.primary = recategory;
          return;
        }

        formatPersonalFinanceCategory(item);

        if(!categorizers.length) {
          return item.personal_finance_category.primary;
        }

        let _important;

        for(const categorizeConfig of categorizers) {
          if(!categorizeConfig.method || _important) continue;

          const conditionMet = categorizeConfig.method(item);

          if(conditionMet) {
            const categoryName = categorizeConfig.categorizeAs;
            if(categorizeConfig._isImportant) _important = categorizeConfig.categorizeAs;

            item.rulesApplied = item.rulesApplied || new Set();

            if(!item.rulesApplied.has(categorizeConfig._id)) {
              item.rulesApplied.add(categorizeConfig._id);
            }

            item.personal_finance_category.primary = (_important || categoryName).toLowerCase();
          }
        }
      }

      const filter = (item) => {
        if(!filters.length) {
          return true;
        }

        let _isImportant = false;

        const itemPassesEveryFilter = filters.every(filterConfig => {
          const filterConditionMet = filterConfig.method(item);

          if(!filterConditionMet) {
            return false;
          }

          _isImportant = filterConfig._isImportant;

          return true;
        });

        return itemPassesEveryFilter || _isImportant;
      }

      const groupBy = (item) => {
        return {
          category: () => item.personal_finance_category.primary,
          year: () => {
            const [year] = item.date.split('-');
            return year;
          },
          month: () => {
            const [_, month] = item.date.split('-');

            return months[Number(month-1)];
          },
          year_month: () => {
            const [year, month] = item.date.split('-');

            return `${year} ${months[Number(month-1)]}`;
          },
          day: () => {
            const [_, month, day] = item.date.split('-');

            return `${months[Number(month-1)]}, ${day}`;
          },
          weekday: () => {
            return getDayOfWeek(item.date)
          }
        }[propToGroupBy[0] || 'category']();
      }

      return {
        sort, 
        categorize,
        propToGroupBy: propToGroupBy || 'category',
        groupBy, 
        filter
      };
    }

    async function deselectOtherTabs(selectedTabs) {
      for(const tab of selectedTabs.splice(1)) {
        tab.isSelected = false;

        await api.put(`api/tabs/${tab._id}`, { isSelected: false });
      }
    }

    function equals(itemValue, valueToCheck) {
      if(isNaN(itemValue)) {
        return itemValue == valueToCheck;
      } else {
        return parseFloat(itemValue) == parseFloat(valueToCheck)
      }
    }

    function extractAndSortRuleTypes(tabRules) {
      const sorters = [], categorizers = [], filters = [], propToGroupBy = [];

      for(const ruleConfig of tabRules) {
        const [ruleType, itemPropName, ruleMethodName, testStandard, categorizeAs] = ruleConfig.rule;

        const ruleMethod = (item) => {
          const itemValue = getItemValue(item, itemPropName);

          return ruleMethods.hasOwnProperty(ruleMethodName)
            ? ruleMethods[ruleMethodName](itemValue, testStandard)
            : typeof itemValue[ruleMethodName] === 'function'
            ? itemValue[ruleMethodName](testStandard)
            : false;          
        }

        const { orderOfExecution, _isImportant } = ruleConfig;

        if(ruleType === 'groupBy') {
          propToGroupBy.push(itemPropName);
        }

        if(ruleType === 'sort') {
          sorters.push({
            itemPropName,
            orderOfExecution
          });
        }

        if(ruleType === 'categorize') {
          categorizers.push({
            _id: ruleConfig._id,
            method: ruleMethod,
            categorizeAs,
            itemPropName, ruleMethodName, testStandard,
            orderOfExecution,
            _isImportant
          });
        }

        if(ruleType === 'filter') {
          filters.push({
            method: ruleMethod,
            orderOfExecution,
            _isImportant
          });
        }
      }

      const sortedRuleTypes = [sorters, categorizers, filters]
        .map(ruleTypeConfigArray => ruleTypeConfigArray.sort(sortBy('orderOfExecution')));

      return [...sortedRuleTypes, propToGroupBy];
    }

    function extractDateRange() {
      const { date : { start, end } } = state;

      return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
    }

    async function fetchTransactions(account_id, dateRange) {
      if(!account_id || !dateRange) {
        return;
      }

      const baseUrl = 'api/plaid/transactions';
      const query = `?account_id=${account_id}&date=${dateRange}`;

      return await api.get(baseUrl+query);
    }

    async function fetchUserTabs() {
      return await api.get('api/tabs');
    }

    async function fetchUserRules() {
      return await api.get('api/rules');
    }

    function filterGlobalRules() {
      return state.allUserRules.filter(ruleItem => {
        const tabIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');

        return tabIsGlobal;
      });
    }

    function filterRulesForTab(tabId) {
      return state.allUserRules.filter(ruleItem => {
        const applyForTabsIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');
        const applyForTabMatchesTabId = ruleItem.applyForTabs.includes(tabId);

        return applyForTabsIsGlobal || applyForTabMatchesTabId;
      });
    }

    function formatPersonalFinanceCategory(item) {
      const { primary } = item.personal_finance_category;

      if(!primary) {
        return 'misc';
      }

      const lower = primary.toLowerCase();

      item.personal_finance_category.primary = lower.split('_').join(' ');
    }

    function getDayOfWeek(dateString) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const date = new Date(dateString);
      const dayOfWeek = date.getDay();
      return days[dayOfWeek];
    }

    function getItemValue(item, propName) {
      return propName === 'category'
        ? item.personal_finance_category.primary
        : item[propName];
    }

    function includes(itemValue, valueToCheck) {
      itemValue = String(itemValue || '').toLowerCase();
      valueToCheck = String(valueToCheck || '').toLowerCase();
      
      return makeArray(valueToCheck.split(',')).some(valueToCheckItem => 
        itemValue.includes(valueToCheckItem)
      );
    }

    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) {
          resolve();
          return;
        }

        const el = document.createElement('script');

        el.type = 'text/javascript';
        el.async = true;
        el.src = src;

        el.addEventListener('load', resolve);
        el.addEventListener('error', reject);
        el.addEventListener('abort', reject);

        document.head.appendChild(el);
      });
    }

    function makeArray(value) {
      return Array.isArray(value) ? value : [value];
    }

    function processTabData(data, tab) {
      const tabRules = [
        ...filterRulesForTab(tab._id),
        ...filterGlobalRules()
      ];

      const { filter, sort, categorize, groupBy, propToGroupBy } = buildRuleMethods(tabRules);

      const dataCopy = sort(data);
      const categorizedItems = [];
      let tabTotal = 0;

      for(const item of dataCopy) {
        item.amount *= -1;

        categorize(item);

        const typeToGroupBy = groupBy(item) // defaults to category

        if(!filter(item)) {
          continue;
        }

        const amt = parseFloat(item.amount);
        tabTotal += amt;

        if(!tab.isSelected) {
          continue;
        }

        const storedCategory = categorizedItems.find(([storedGroupByName]) => storedGroupByName === typeToGroupBy);

        if(storedCategory) {
          let [_, storedTransactions, storedTotal] = storedCategory;

          storedTransactions.push(item);
          storedCategory[2] = storedTotal + amt;
        } else {
          categorizedItems.push([typeToGroupBy, [item], amt])
        }
      }

      // sort grouped items
      if(!['year', 'month', 'day', 'year_month'].includes(propToGroupBy[0])) {
        if(tabTotal > 0) {
          categorizedItems.sort((a, b) =>  b[2] - a[2]);
        } else {
          categorizedItems.sort((a, b) =>  a[2] - b[2]);
        }        
      } else {
        categorizedItems.sort(groupByDate);
      }

      return { tabTotal, categorizedItems };
    }

    async function renderSyncStatus(syncCheckId) {
      if(state.syncCheckId !== syncCheckId) {
        return;
      }

      let itemsSyncing = [];
      const items = await api.get('api/plaid/items');

      if(!items.length) {
        state.syncCheckId = false;
        return;
      }

      for (const item of items ) {
        if(item.syncData.status === 'completed') {
          continue;
        }

        itemsSyncing.push(item.syncData.status);
      }

      if(!itemsSyncing.length) {
        state.blueBar.message = `All transactions synced successfully!`;
        state.blueBar.loading = false;
        setTimeout(() => {
          state.syncCheckId = false;
          state.blueBar.message = false;
          state.syncCheckId = false;
        }, 3000);

        return;
      }

      const s = itemsSyncing.length > 1 ? 's' : '';
      const syncStatus = itemsSyncing.includes('queued') ? 'Queued' : itemsSyncing[0];
      state.blueBar.message = `Sync status is '${syncStatus}' across ${itemsSyncing.length} bank${s}.`;
      state.blueBar.loading = true;

      if(itemsSyncing.includes('failed')) {
        state.views.push('ItemRepair');
        state.blueBar.loading = false;
        state.syncCheckId = false;
        state.blueBar.message = false;
        state.syncCheckId = false;
        return;
      }

      setTimeout(() => renderSyncStatus(syncCheckId), 5*1000);
    }

    function selectFirstGroup() {
      const firstGroup = state.allUserGroups[0];

      firstGroup.isSelected = true;
      api.put(`api/groups/${firstGroup._id}`, { isSelected: true });
      return firstGroup;
    }

    function selectFirstTab(selectedTabs) {
      const firstTab = selectedTabs[0];

      firstTab.isSelected = true;
      api.put(`api/tabs/${firstTab._id}`, { isSelected: true });
    }

    function selectedTabsInGroup() {
      return state.selected.tabsForGroup.filter(tab => tab.isSelected);
    }

    function sortBy(prop) {
      return (a, b) => a[prop] - b[prop];
    }

    function groupByDate(a, b) {
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };

      const [yearA, monthA] = a[0].split(' ');
      const [yearB, monthB] = b[0].split(' ');

      if (yearA !== yearB) {
        return yearB - yearA;
      } else {
        return months[monthB] - months[monthA];
      }
    }

    function yyyyMmDd(dateObject) {
      if(!dateObject) return;
      const year = dateObject.getFullYear();
      const month = String(dateObject.getMonth() + 1).padStart(2, '0');
      const day = String(dateObject.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }

    return {
      checkSyncStatus: async () => {
        if(state.syncCheckId !== false) {
          return;
        }

        const syncCheckId = Date.now();
        state.syncCheckId = syncCheckId;
        await renderSyncStatus(syncCheckId);
      },
      createNewTab: async () => {
        if(!state.selected.group) {
          return;
        }

        const selectedGroup = state.selected.group;
        const selectedTab = state.selected.tab;
        const tabsForGroup = state.selected.tabsForGroup;

        if(selectedTab) {
          selectedTab.isSelected = false;
          api.put(`api/tabs/${selectedTab._id}`, { isSelected: false });
        }

        const newTab = await api.post('api/tabs', {
          tabName: `Tab ${tabsForGroup.length+1}`,
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
        state.blueBar.message = 'Beginning sync';
        state.blueBar.loading = true;

        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

        state.allUserTabs = await fetchUserTabs();          
        state.allUserRules = await fetchUserRules();
        
        const { groups, accounts } = await api.get('api/plaid/sync/accounts/and/groups');

        if(!groups.length) {
          state.views.push('SelectGroup');
        }

        state.allUserAccounts = accounts;
        state.allUserGroups = groups;

        await api.get('api/plaid/sync/all/transactions');
        app.checkSyncStatus();
        app.handleGroupChange();
      },
      handleGroupChange: async () => {
        let selectedGroup = state.selected.group;
        const tabsForGroup = state.selected.tabsForGroup;

        if(state.date.start > state.date.end) {
          return;
        }

        if(!selectedGroup) {
          if(!state.allUserGroups.length) {
            return;
          }

          selectedGroup = selectFirstGroup();
        }

        state.isLoading = true;
        state.selected.allGroupTransactions = [];

        for(const account of selectedGroup.accounts) {
          state.selected.allGroupTransactions = [
            ...state.selected.allGroupTransactions,
            ...await fetchTransactions(account.account_id, extractDateRange())
          ]
        };

        if(!tabsForGroup.length) {
          nextTick(async () => {
            await app.createNewTab();
            state.isLoading = false;
          });
          return;
        }

        await app.processAllTabsForSelectedGroup();
      },
      handleTabChange: (newSelectedTabId, oldSelectedTabId) => {
        if (newSelectedTabId === oldSelectedTabId) {
          return;
        }

        if(oldSelectedTabId) {
          const oldSelectedTab = state.allUserTabs.find(({ _id }) =>  _id === oldSelectedTabId);

          oldSelectedTab.categorizedItems = [];
        }

        if(!newSelectedTabId) {
          return;
        }
        
        const processed = processTabData(state.selected.allGroupTransactions, state.selected.tab);

        state.selected.tab.categorizedItems = processed.categorizedItems;
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

        if(!tabsForGroup.length) {
          return;
        }

        state.isLoading = true;

        const selectedTabs = selectedTabsInGroup();

        if(selectedTabs.length < 1) {
          selectFirstTab(tabsForGroup);
        }

        if(selectedTabs.length > 1) {
          await deselectOtherTabs(selectedTabs);
        }

        for(const tab of tabsForGroup) {
          tab.categorizedItems = [];

          const processed = processTabData(state.selected.allGroupTransactions, tab);

          tab.total = processed.tabTotal;
          tab.categorizedItems = processed.categorizedItems;
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
  
  watch(() => state.view, app.handleViewChange);
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
button.acctButton:hover, button.tab-button:hover, button.view-all:hover,
button.acctButton:focus, button.tab-button:focus, button.view-all:focus,
button.acctButton:active, button.tab-button:active, button.view-all:active {
  background: #fff;
}

.acctButton {
  background: lightsteelblue;
}

.blue-bar {
  background-color: slateblue;
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