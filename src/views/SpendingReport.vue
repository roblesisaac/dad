<template>
  <!-- BackButton -->
  <Transition>
    <button @click="state.view='home'" v-if="!state.is(['home', 'loading'])" class="acctButton section b-bottom"><ChevronLeft class="icon" /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    
    <!-- Selected Group + Date -->
    <div class="cell-1">
      <div class="grid middle">

        <!-- Group Selector -->
        <div class="cell-6-24 section b-bottom b-right line50">
          <button @click="state.view='SelectGroup'" class="acctButton section-content proper" href="#" v-html="groupName">
          </button>
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
        <div v-for="(tab, tabIndex) in state.selected.group.tabs" class="cell auto reportTab">
          <TabButton :state="state" :tab="tab" :key="tabIndex" />
        </div>
        <div class="cell auto reportTab bold">
          <div class="relative pointer section b-bottom b-left line50">
            + New Tab
          </div>
        </div>
      </ScrollingContent>
    </div>

    <!-- Category Rows -->
    <Transition>
      <div v-if="!state.isLoading && state.is('home')" class="cell-1">
        <CategoriesWrapper :state="state" />
      </div>
    </Transition>
    <Transition>
      <LoadingDots v-if="state.isLoading"></LoadingDots>
    </Transition>
  </div>

  <!-- SelectGroup -->
  <Transition>
    <SelectGroup v-if="state.is('SelectGroup')" :state="state"></SelectGroup>
  </Transition>

  <!-- EditTab -->
  <Transition>
    <EditTab v-if="state.is('EditTab')" :state="state"></EditTab>
  </Transition>
</template>

<script setup>
  import { computed, onMounted, nextTick, reactive, watch } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
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
    date: {
      start: 'firstOfMonth',
      end: 'today'
    },
    elems: {
      body: document.documentElement.style,
      topNav: document.querySelector('.topNav').style
    },
    global: {
      tabs: [],
      rules: []
    },
    isLoading: false,
    is(view) {
      const viewes = Array.isArray(view) ? view : [view];
      return viewes.includes(this.view);
    },
    isSmallScreen() {
      return State.currentScreenSize() === 'small'
    },
    linkToken: null,
    selected: {
      group: {},
      tab: {}
    },
    view: 'home'
  });

  const groupName = computed(() => {
    const { group } = state.selected;

    return group.name ? 
      `${group.name}` 
      : `<span class="underline">Account</span>`
  });

  const app = function() {
    const ruleMethods = {
      '>=': (itemValue, valueToCheck) => parseFloat(itemValue) >= parseFloat(valueToCheck),
      '>': (itemValue, valueToCheck) => parseFloat(itemValue) > parseFloat(valueToCheck),
      '=': (itemValue, valueToCheck) => parseFloat(itemValue) == parseFloat(valueToCheck),
      '<=': (itemValue, valueToCheck) => parseFloat(itemValue) <= parseFloat(valueToCheck),
      '<': (itemValue, valueToCheck) => parseFloat(itemValue) < parseFloat(valueToCheck),
      includes: function (itemValue, valueToCheck) {
        itemValue = String(itemValue || '').toLowerCase();
        valueToCheck = String(valueToCheck || '').toLowerCase();
        
        return makeArray(valueToCheck.split(',')).some(valueToCheckItem => 
          itemValue.includes(valueToCheckItem)
        );
      },
      excludes: function(itemValue, valueToCheck) {
        return !this.includes(itemValue, valueToCheck)
      }
    };

    function assignRulesAndTabsToGroup(group) {
      let tabs = [
        ...filterTabsForGroup(group.name),
        ...filterGlobalTabs()
      ];

      tabs = tabs.map(tab => ({
        ...tab,
        total: 0,
        categorizedItems: [],
        rules: [
          ...filterRulesForTab(group.name, tab.tabName),
          ...filterGlobalRules(),
        ]
      }));

      return {
        ...group,
        tabs,
        allGroupTransactions: []
      };
    }

    function buildRuleMethods(tabRules) {
      const [ sorters, categorizers, filters ] = extractAndSortRuleTypes(tabRules);

      const sort = (arrayToSort) => {
        if(!sorters.length) sorters.push({ itemPropName: '-date' });

        for(const { itemPropName } of sorters) {
          const isInReverse = itemPropName.startsWith('-');
          const propName = isInReverse ? itemPropName.slice(1) : itemPropName;
          
          arrayToSort.sort((a, b) => {
            const valueA = propName === 'date' ? new Date(a[propName]) : a[propName];
            const valueB = propName === 'date' ? new Date(b[propName]) : a[propName];

            return isInReverse ? valueB - valueA : valueA - valueB;
          });
        }
      };

      const categorize = (item) => {
        if(!categorizers.length) {
          return defaultCategorize(item);
        }

        let categoryName;
        let _important;

        for(const categorizeConfig of categorizers) {
          if(!categorizeConfig.method) continue;

          const conditionMet = categorizeConfig.method(item);

          if(conditionMet) {
            categoryName = categorizeConfig.categorizeAs;
            if(categorizeConfig._isImportant) _important = categorizeConfig.categorizeAs;
          }
        }

        return _important || categoryName || defaultCategorize(item);
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

    function currentlySelectedGroup() {
      return state.allUserGroups.find(group => group.isSelected);
    }

    function currentlySelectedTab() {
      return state.selected.group?.tabs.find(tab => tab.isSelected);
    }
    
    function defaultCategorize(item) {
      const { category } = item;

      if(!category) {
        return;
      }

      const split = category.split(',');

      return split[split.length-1];
    }

    function extractAndSortRuleTypes(tabRules) {
      const sorters = [], categorizers = [], filters = [];

      for(const ruleConfig of tabRules) {
        const [ruleType, itemPropName, ruleMethodName, testStandard, categorizeAs] = ruleConfig.rule;
        const ruleMethod = ruleMethods[ruleMethodName];
        const { orderOfExecution, _isImportant } = ruleConfig;

        if(ruleType === 'sort') {
          sorters.push({
            itemPropName,
            orderOfExecution
          });
        }

        if(ruleType === 'categorize') {
          categorizers.push({
            method: (item) => ruleMethod(item[itemPropName], testStandard),
            categorizeAs,
            orderOfExecution,
            _isImportant
          });
        }

        if(ruleType === 'filter') {
          filters.push({
            method: (item) => ruleMethod(item[itemPropName], testStandard),
            orderOfExecution,
            _isImportant
          });
        }
      }

      const byOrderOfExecution = (a, b) => a.orderOfExecution - b.orderOfExecution;

      return [sorters, categorizers, filters]
        .map(ruleTypeConfig => ruleTypeConfig.sort(byOrderOfExecution));
    }

    function extractDateRange() {
      const { date : { start, end } } = state;

      return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
    }

    async function fetchAndSyncData() {
      return api.get('api/plaid/sync/all/user/data');
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
      const fetchedTabs = [
        { 
          tabName: 'positive',
          showForGroup: ['_GLOBAL'],
          isSelected: true,
          order: 1
        }, 
        { 
          tabName: 'negative',
          showForGroup: ['_GLOBAL'],
          // total: ['negative'], //defaults to itself
          isSelected: false,
          order: 2
        }, 
        // { 
        //   tabName: 'net',
        //   showForGroup: ['_GLOBAL'], 
        //   tabs: ['positive', 'negative'],
        //   isSelected: false
        // }
      ];

      return fetchedTabs.map(tab => ({
        ...tab,
        total: 0,
        categorizedItems: []
      }));
    }

    async function fetchUserRules() {
      return [
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['_GLOBAL'],
          rule: ['categorize', 'name', 'includes', 'amazon', 'amazon'],
          orderOfExecution: 1
        },
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['_GLOBAL'],
          rule: ['categorize', 'category', 'includes', 'coffee', 'coffee'],
          orderOfExecution: 1
        },
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['_GLOBAL'],
          rule: ['sort', '-date'],
          orderOfExecution: 1
        },
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['positive'],
          rule: ['filter', 'amount', '<', '0'],
          orderOfExecution: 1
        },
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['negative'],
          rule: ['filter', 'amount', '>', '0'],
          orderOfExecution: 1
        }
      ]
    }

    function filterGlobalTabs() {
      return state.allUserTabs.filter(tabItem => tabItem.showForGroup.includes('_GLOBAL'))
    }

    function filterGlobalRules() {
      return state.allUserRules.filter(ruleItem => {
        const accountIsGlobal = ruleItem.applyForGroups.includes('_GLOBAL');
        const tabIsGlobal = ruleItem.applyForTabs.includes('_GLOBAL');

        return accountIsGlobal && tabIsGlobal;
      });
    }

    function filterRulesForTab(groupName, tabName) {
      return state.allUserRules.filter(ruleItem => {
        const acceptablGroupNames = [groupName, '_GLOBAL'];

        const matchesAccount = acceptablGroupNames.some(
          acceptableName => ruleItem.applyForGroups.includes(acceptableName)
        );
        const matchesTab = ruleItem.applyForTabs.includes(tabName);

        return matchesAccount && matchesTab
      });
    }

    function filterTabsForGroup(groupName) {
      return state.allUserTabs.filter(tabItem => tabItem.showForGroup.includes(groupName));
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
      const { filter, sort, categorize } = buildRuleMethods(tab.rules);

      sort(data);
      const categorizedItems = [];
      let tabTotal = 0;

      for(const item of data) {
        if(!filter(item)) {
          continue;
        }

        const categoryName = categorize(item);
        const amt = parseFloat(item.amount);        
        const storedCategory = categorizedItems.find(([storedCategoryName]) => storedCategoryName === categoryName);

        if(storedCategory) {
          let [_, storedData, storedTotal] = storedCategory;

          storedData.push(item);
          storedTotal += amt;
        } else {
          categorizedItems.push([categoryName, [item], amt])
        }

        tabTotal += amt;
      }

      return { tabTotal, categorizedItems };
    }
    
    function selectGroup(index) {
      state.selected.group.isSelected = true;
      state.selected.group = state.allUserGroups[index];
    }
    
    function selectTab(index) {
      const { selected } = state;

      selected.group.tabs.forEach((tab, tabIndex) => {
        tab.isSelected = tabIndex === index;
      });

      selected.tab = selected.group.tabs[index];
    }

    function yyyyMmDd(dateObject) {
      const year = dateObject.getFullYear();
      const month = String(dateObject.getMonth() + 1).padStart(2, '0');
      const day = String(dateObject.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }

    return {
      init: async () => {
        changeBgColor('rgb(243, 243, 238)');  
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');

        state.allUserTabs = await fetchUserTabs();
        state.allUserRules = await fetchUserRules();
        
        const response = await fetchAndSyncData();

        state.allUserAccounts = response.accounts;
        state.allUserGroups = response.groups.map(assignRulesAndTabsToGroup);

        if(currentlySelectedGroup()) {
          state.selected.group = currentlySelectedGroup();
        }

        selectGroup(0);
      },
      handleGroupChange: async () => {
        const { selected } = state;

        state.isLoading = true;

        if(!selected.group || !selected.group.tabs) return;

        state.selected.tab = currentlySelectedTab() || selectTab(0);
        selected.group.allGroupTransactions = [];

        for(const { account_id } of selected.group.accounts) {
          selected.group.allGroupTransactions = [
            ...selected.group.allGroupTransactions,
            ...await fetchTransactions(account_id, extractDateRange())
          ]
        };

        for(const tab of selected.group.tabs) {
          const processed = processTabData(selected.group.allGroupTransactions, tab);

          tab.total = processed.tabTotal;
          tab.categorizedItems = processed.categorizedItems;
        }

        state.isLoading = false;
      }
    }
  }();

  app.init();

  watch(() => state.selected.group._id, app.handleGroupChange);
  watch(() => state.date.start, app.handleGroupChange);
  watch(() => state.date.end, app.handleGroupChange);

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