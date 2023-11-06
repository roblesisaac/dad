<template>
  <!-- BackButton -->
  <Transition>
    <div v-if="state.blueBar.message" class="grid">
      <div class="cell-1 p10l  bgBlue bold">
        <small class="colorBleach">{{ state.blueBar.message }}<LoadingDots v-if="state.blueBar.loading" /></small>
      </div>
    </div>
  </Transition>
  <Transition>
    <button @click="state.view='home'" v-if="!state.is(['home', 'loading', 'EditTab'])" class="acctButton section b-bottom"><ChevronLeft class="icon" /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    
    <!-- Selected Group + Date -->
    <div class="cell-1">
      <div class="grid middle">

        <!-- Group Selector Button -->
        <div class="cell-6-24 section b-bottom b-right line50">
          <ShowSelectGroupButton :state="state" />
        </div>

        <!-- Date Pickers -->
        <div class="cell-18-24 section b-bottom line50">          
          <div class="grid">
            <div class="cell-10-24">
              <DatePicker :date="state.date" when="start" />
            </div>
            <div class="cell-4-24 bold">thru</div>
            <div class="cell-10-24">
              <DatePicker :date="state.date" when="end" />
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Scrolling Tabs -->
    <div class="cell-1 totalsRow">
      <ScrollingContent>
        <div v-for="(tab, tabIndex) in state.selected.tabsForGroup" class="cell auto reportTab">
          <TabButton :state="state" :tab="tab" :key="tabIndex" :tabIndex="tabIndex" />
        </div>
        <div @click="app.createNewTab()" class="cell auto reportTab bold">
          <div class="relative pointer section b-bottom b-left line50">
            + Tab
          </div>
        </div>
      </ScrollingContent>
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

  <!-- SelectGroup -->
  <Transition>
    <SelectGroup v-if="state.is('SelectGroup')" :state="state" :App="app"></SelectGroup>
  </Transition>

  <!-- EditTab -->
  <Transition>
    <EditTab v-if="state.is('EditTab')" :state="state"></EditTab>
  </Transition>
</template>

<script setup>
  import { computed, nextTick, onMounted, reactive, watch } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  // import CheckBold from 'vue-material-design-icons/CheckBold.vue';
  import ShowSelectGroupButton from '../components/ShowSelectGroupButton.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import SelectGroup from '../components/SelectGroup.vue';
  import DatePicker from '../components/DatePicker.vue';
  import TabButton from '../components/TabButton.vue';
  import EditTab from '../components/EditTab.vue';
  import CategoriesWrapper from '../components/CategoriesWrapper.vue';
  // import SelectedItems from '../components/SelectedItems.vue';
  import ScrollingContent from '../components/ScrollingContent.vue';
  import { useAppStore } from '../stores/app';

  const { api, State, sticky } = useAppStore();

  onMounted(() => {
    sticky.stickify('.totalsRow');
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
    elems: {
      body: document.documentElement.style,
      topNav: document.querySelector('.topNav').style
    },
    isLoading: false,
    is(view) {
      const views = Array.isArray(view) ? view : [view];
      return views.includes(this.view);
    },
    isSmallScreen: () => State.currentScreenSize() === 'small',
    linkToken: null,
    selected: {
      allGroupTransactions: [],
      group: computed(() => state.allUserGroups.find(group => group.isSelected) ),
      tabsForGroup: computed(() => {
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
      }),
      tab: computed(() => state.selected.tabsForGroup.find(tab => tab.isSelected) ),
      transaction: false
    },
    syncCheckId: false,
    view: 'home'
  });

  const app = function() {
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
      const [ sorters, categorizers, filters ] = extractAndSortRuleTypes(tabRules);

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

            item.personal_finance_category.primary = (_important || categoryName).toLowerCase();
          }
        }

        return item.personal_finance_category.primary;
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

      return {
        sort, 
        categorize, 
        filter
      };
    }

    function changeBgColor(color) {
      const { elems } = state;

      elems.topNav.backgroundColor = elems.body.backgroundColor = color;
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
      const sorters = [], categorizers = [], filters = [];

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

        if(ruleType === 'sort') {
          sorters.push({
            itemPropName,
            orderOfExecution
          });
        }

        if(ruleType === 'categorize') {
          categorizers.push({
            method: ruleMethod,
            categorizeAs,
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

      return [sorters, categorizers, filters]
        .map(ruleTypeConfigArray => ruleTypeConfigArray.sort(sortBy('orderOfExecution')));
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
      const { items } = await api.get('api/tabs');

      return items;
    }

    async function fetchUserRules() {
      const { items } = await api.get('api/rules');

      return items;
    }

    function filterGlobalRules() {
      return state.allUserRules.filter(ruleItem => {
        const accountIsGlobal = ruleItem.applyForGroups.includes('_GLOBAL');
        const tabIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');

        return accountIsGlobal && tabIsGlobal;
      });
    }

    function filterRulesForTab(tabId, groupId) {
      return state.allUserRules.filter(ruleItem => {
        // const groupIdMatches = ruleItem.applyForGroups.includes(groupId);

        // if(!groupIdMatches) {
        //   return false;
        // }

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
      const selectedGroup = state.selected.group;

      const tabRules = [
        ...filterRulesForTab(tab._id, selectedGroup._id),
        ...filterGlobalRules()
      ];

      const { filter, sort, categorize } = buildRuleMethods(tabRules);

      const dataCopy = sort(data);
      const categorizedItems = [];
      let tabTotal = 0;

      for(const item of dataCopy) {
        
        const categoryName = categorize(item);

        // if(groupByConfig) {
        //   groupByConfig(item); // year, day, month, weekday, item.month = jan
        // }

        if(!filter(item)) {
          continue;
        }

        const amt = parseFloat(item.amount);
        tabTotal += amt;

        if(!tab.isSelected) {
          continue;
        }

        const storedCategory = categorizedItems.find(([storedCategoryName]) => storedCategoryName === categoryName);

        if(storedCategory) {
          let [_, storedTransactions, storedTotal] = storedCategory;

          storedTransactions.push(item);
          storedCategory[2] = storedTotal + amt;
        } else {
          categorizedItems.push([categoryName, [item], amt])
        }
      }

      // sort categories by totals
      if(tabTotal > 0) {
        categorizedItems.sort((a, b) =>  b[2] - a[2]);
      } else {
        categorizedItems.sort((a, b) =>  a[2] - b[2]);
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

        const newTabData = {
          ...newTab,
          total: 0,
          categorizedItems: []
        }

        state.allUserTabs.push(newTabData);
        await app.processAllTabsForSelectedGroup();
      },
      init: async () => {
        state.blueBar.message = 'Beginning sync';
        state.blueBar.loading = true;
        state.isLoading = true;        
        changeBgColor('rgb(243, 243, 238)');  
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

        state.allUserTabs = await fetchUserTabs();          
        state.allUserRules = await fetchUserRules();
        
        const { groups, accounts } = await api.get('api/plaid/sync/accounts/and/groups');

        if(!groups.length) {
          state.view = 'SelectGroup';
        }

        state.allUserAccounts = accounts;
        state.allUserGroups = groups;

        await app.checkSyncStatus();
        await api.get('api/plaid/sync/all/transactions');
        app.handleGroupChange();
      },
      handleGroupChange: async () => {
        let selectedGroup = state.selected.group;
        const tabsForGroup = state.selected.tabsForGroup;

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

        state.isLoading = false;
      },
      handleTabChange: (newSelectedTab, oldSelectedTab) => {
        if (newSelectedTab && oldSelectedTab && newSelectedTab._id === oldSelectedTab._id) {
          return;
        }

        if(oldSelectedTab) {
          oldSelectedTab.categorizedItems = [];
        }

        if(!newSelectedTab) {
          return;
        }
        
        const processed = processTabData(state.selected.allGroupTransactions, newSelectedTab);

        newSelectedTab.categorizedItems = processed.categorizedItems;
      },
      handleViewChange: async (newView, oldView) => {
        if(newView !== 'home') {
          return;
        }

        if(oldView === 'SelectGroup') {
          return app.handleGroupChange();
        }

        await app.processAllTabsForSelectedGroup();
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

        nextTick(state.isLoading = false);
      },
      processTabData
    }
  }();

  app.init();

  watch(() => state.date.start, app.handleGroupChange);
  watch(() => state.date.end, app.handleGroupChange);
  watch(() => state.view, app.handleViewChange);
  watch(() => state.selected.tab, app.handleTabChange, { deep: true });

</script>

<style>
.acctButton, .acctButton:hover {
  background: transparent;
  color: blue;
  box-shadow: none;
  width: 100%;
}

.acctButton:hover {
  color: blue;
}

.dottedRow {
  border-bottom: 2px dotted #000;
  padding: 20px;
  text-align: left;
  font-weight: bold;
  cursor: pointer;
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

.section {
  height: 50px;
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

.b-top {
  border-top: 2px solid #000;
}

.totalsRow {
  background-color: rgb(243 243 238);
}

.relative {
  position: relative;
}

.reportTab {
  min-width: 150px;
}

.section-title {
  position: absolute;
  top: 0px;
  left: 5px;
  text-transform: uppercase;
  font-weight: 900;
}
.section-content {
  color: blue;
  font-weight: 900;
}

.underline {
  text-decoration: underline;
}
</style>