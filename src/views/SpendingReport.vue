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

    <!-- Tab Selector -->
   <div class="cell-1 totalsRow">
      <div class="grid">
        <div v-for="(tab, tabIndex) in state.selected.group.tabs" class="cell auto">
          <ReportTab :state="state" :tab="tab" :key="tabIndex" />
        </div>
      </div>
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
</template>

<script setup>
  import { computed, onMounted, nextTick, reactive, watch } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import SelectGroup from '../components/SelectGroup.vue';
  import DatePicker from '../components/DatePicker.vue';
  import ReportTab from '../components/ReportTab.vue';
  import CategoriesWrapper from '../components/CategoriesWrapper.vue';
  // import SelectedItems from '../components/SelectedItems.vue';
  // import ScrollingContent from '../components/ScrollingContent.vue';
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
    function assignRulesAndTabsToGroup(group) {
      let tabs = [
        ...filterTabsForGroup(group._id),
        ...state.global.tabs
      ];

      tabs = tabs.map(tab => ({
        ...tab,
        categorizedItems: {},
        rules: [
          ...filterRulesForTab(group._id, tab.tabName),
          ...state.global.rules,
        ]
      }));

      return {
        ...group,
        tabs,
        groupTransactions: []
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
      return state.selected.group.tabs.find(tab => tab.isSelected);
    }

    function extractDate() {
      const { date : { start, end } } = state;

      return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
    }

    async function fetchAndSyncData() {
      return api.get('api/plaid/sync/all/user/data');
    }

    function filterRulesForTab(groupId, tabName) {
      return state.allUserRules.filter(ruleItem => {
        const matchesAccount = ruleItem.applyForGroups.includes(groupId);
        const matchesTab = ruleItem.applyForTabs.includes(tabName);

        return matchesAccount && matchesTab
      });
    }

    async function fetchTransactions(account_id) {
      const date = extractDate();

      if(!account_id || !date) {
        return;
      }

      let url = `api/plaid/transactions?account_id=${account_id}&date=${date}`;

      return await api.get(url);
    }

    async function fetchUserTabs() {
      const fetchedTabs = [
        { 
          tabName: 'positive',
          showForGroup: ['_GLOBAL'],
          isSelected: true,
        }, 
        { 
          tabName: 'negative',
          showForGroup: ['_GLOBAL'],
          total: ['negative'], //defaults to itself
          isSelected: false
        }, 
        { 
          tabName: 'net',
          showForGroup: ['_GLOBAL'], 
          total: ['positive', '-negative'],
          isSelected: false
        },
        {
          tabName: 'shop related',
          showForGroup: ['xxxx', 'xxxx'],
          isSelected: false
        },
        {
          tabName: 'nsr',
          showForGroup: ['xxxx', 'xxxx'],
          isSelected: false
        }
      ];

      return fetchedTabs.map(tab => ({
        ...tab,
        data: []
      }));
    }

    async function fetchUserRules() {
      return [
        {
          applyForGroups: ['_GLOBAL'],
          applyForTabs: ['_GLOBAL'],
          categorize: [
            ['name', 'includes', 'sparkfun', 'tracktab.com'],
            ['date', 'includes', '-8-', 'august'],
            // ['amount', '>', '0', 'income'],
            ['name', 'includes', ['uber','sparkfun'], 'tracktabs', true],
            ['amount', '<', '0', 'expense'],
            // ['name', 'includes', ['united airlines', 'uber'], 'tracktabit'],
            ['name', 'includes', ['classic'], 'payroll']
          ],
          filters: [
            ['amount', '>', '0']
          ],
          sort: ['-date'] // default
        },
        {
          applyForGroups: ['9139'],
          applyForTabs: ['positive'],
          filters: [
            ['amount', '>', '0'],
            // ['name', 'includes', ['magnaflow'], 'important']
          ],
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

    function filterTabsForGroup(groupId) {
      return state.allUserTabs.filter(tabItem => tabItem.showForGroup.includes(groupId));
    }

    function getCategoryName(item) {
      const { category } = item;

      if(!category) {
        return;
      }

      const split = category.split(',');

      return split[split.length-1];
    }

    const ruleMethods = {
      '>=': (itemValue, valueToCheck) => itemValue >= valueToCheck,
      '>': (itemValue, valueToCheck) => itemValue > valueToCheck,
      '=': (itemValue, valueToCheck) => itemValue == valueToCheck,
      '<=': (itemValue, valueToCheck) => itemValue <= valueToCheck,
      '<': (itemValue, valueToCheck) => itemValue < valueToCheck,
      includes: function (itemValue, valueToCheck) {
        return makeArray(valueToCheck).some(valueToCheckItem => 
          itemValue.includes(valueToCheckItem)
        );
      },
      excludes: function(itemValue, valueToCheck) {
        return !this.includes(itemValue, valueToCheck)
      }
    };

    function getRules(rules) {
      const filterRules = rules.filter(rule => rule.hasOwnProperty('filters'));
      const categorizerRules = rules.filter(rule => rule.hasOwnProperty('categorize'));
      let propsToSortBy = [];
      
      for(const rule of rules) {
        if(rule.sort) propsToSortBy = [...propsToSortBy, ...rule.sort];
      }

      if(!propsToSortBy.length) propsToSortBy.push('-date');

      const sort = function (arrayOfObjects) {
        return arrayOfObjects.sort((a, b) => {
          let comparison = 0;
          propsToSortBy.forEach(prop => {
            if (comparison === 0) {
              let reverse = false;
              if (prop.startsWith('-')) {
                prop = prop.substring(1);
                reverse = true;
              }
              if (a[prop] > b[prop]) {
                comparison = 1;
              } else if (a[prop] < b[prop]) {
                comparison = -1;
              }
              if (reverse) {
                comparison *= -1;
              }
            }
          });
          return comparison;
        });
      };

      const filter = filterRules.length > 0 ? function(transaction) {
        let importantConditionMet = false;

        return filterRules.every(rule => {
          const allConditionsMet = [];

          for(const filterRule of rule.filters) {
            const [filterProp, filterMethodName, valueToCheck, _isImportant] = filterRule;
            const itemValue = transaction[filterProp];
            const filterMethod = ruleMethods[filterMethodName];

            const conditionMet = filterMethod
              ? filterMethod(itemValue, valueToCheck)
              : itemValue?.[filterMethod]
              ? itemValue[filterMethod](valueToCheck)
              : console.error(`Invalid filter method '${filterMethodName}' found...`);

            allConditionsMet.push(conditionMet);
            if(!importantConditionMet && _isImportant==='important') importantConditionMet=conditionMet;
          }

          return importantConditionMet || !allConditionsMet.includes(false);
        });
      } : () => true;

      const categorize = categorizerRules.length > 0 ? function(transaction) {
        let categorizeAs;

        for(const rule of categorizerRules) {
          
          for (const categorizer of rule.categorize) {
            const [categoryProp, categoryMethodName, categegoryValueToCheck, categorizeAsName, _isImportant] = categorizer;
            const itemValue = transaction[categoryProp];
            const categoryMethod = ruleMethods[categoryMethodName];

            if(categorizeAs && !_isImportant) {
              continue;
            }

            if(categoryMethod) {
              if(categoryMethod(itemValue, categegoryValueToCheck)) {
                categorizeAs = categorizeAsName;
              }

              continue;
            }

            if(itemValue && itemValue?.[categoryMethodName] && itemValue[categoryMethodName](categegoryValueToCheck)) {
              categorizeAs = categorizeAsName;
            }

          }

        }

        return categorizeAs || getCategoryName(transaction);

      } : getCategoryName;

      return { filter, sort, categorize };
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

    function processTabData(tab) {
      const { selected } = state;
      const { rules } = tab;
      const transactions = selected.group.groupTransactions;
      const { filter, sort, categorize } = getRules(rules);

      const data = sort(transactions);
      const categorizedItems = {};
      let tabTotal = 0;

      for(const item of data) {
        if(!filter(item)) {
          continue;
        }

        const categoryName = categorize(item);
        const amt = parseFloat(item.amount);

        categorizedItems[categoryName] ??= {
          categoryTotal: 0,
          categoryItems: []
        };

        categorizedItems[categoryName].categoryItems.push(item);
        categorizedItems[categoryName].categoryTotal += parseFloat(amt);
        tabTotal += amt;
      }

      tab.total = tabTotal;
      tab.categorizedItems = categorizedItems;
    }
    
    function selectGroup(index) {
      state.selected.group = state.allUserGroups[index];
      state.selected.group.isSelected = true;
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
        state.global.tabs = filterGlobalTabs();

        state.allUserRules = await fetchUserRules();
        state.global.rules = filterGlobalRules();
        
        const { accounts, groups } = await fetchAndSyncData();

        state.allUserAccounts = accounts;
        state.allUserGroups = groups.map(assignRulesAndTabsToGroup);

        if(currentlySelectedGroup()) {
          state.selected.group = currentlySelectedGroup();
        }
       
        selectGroup(0);
      },
      handleGroupChange: async () => {
        const { selected } = state;

        state.selected.tab = currentlySelectedTab() || selectTab(0);
        selected.group.transactions = [];

        for(const { account_id } of selected.group.accounts) {
          selected.group.groupTransactions = [
            ...selected.group.groupTransactions,
            ...await fetchTransactions(account_id) // fetches within selected date
          ]
        };

        for(const tab of selected.group.tabs) {
          processTabData(tab);
        }
      }
    }
  }();

  app.init();

  watch(() => state.selected.tab.tabName, app.handleGroupChange);
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