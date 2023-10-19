<template>
  <!-- BackButton -->
  <Transition>
    <button @click="state.view='home'" v-if="!state.is(['home', 'loading'])" class="acctButton section b-bottom"><ChevronLeft class="icon" /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    
    <!-- Account + Date -->
    <div class="cell-1">
      <div class="grid middle">

        <!-- Account Selector -->
        <div class="cell-6-24 section b-bottom b-right line50">
          <button @click="state.view='accountList'" class="acctButton section-content proper" href="#" v-html="acctName">
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

    <!-- Income Expense + Net Tabs -->
    <!-- <ScrollingContent>
      <ReportTab :state="state" tabName="income" />
      <ReportTab :state="state" tabName="expenses" />
      <ReportTab :state="state" tabName="net" />
    </ScrollingContent> -->

    <div class="cell-1 totalsRow">
      <div class="grid">
        <div class="cell auto">
          <ReportTab :state="state" tabName="income" />
        </div>
        <div class="cell auto">
          <ReportTab :state="state" tabName="expenses" />
        </div>
        <div class="cell auto">
          <ReportTab :state="state" tabName="net" />
        </div>
      </div>
    </div>

    <!-- Category Rows -->
    <Transition>
      <div v-if="!state.isLoading && state.is('home')" class="cell-1">
        <AccountCategories :state="state" />
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
      <div class="grid">

        <!-- Account Selector -->
        <div class="cell-1 b-bottom section line50">
          <button @click="state.view='accountList'" class="acctButton section-content proper" href="#" v-html="acctName">
          </button>
        </div>

        <!-- Income Expense + Net Tabs -->
        <div class="cell-1 totalsRow">
          <div class="grid">
            <div class="cell auto">
              <ReportTab :state="state" tabName="income" />
            </div>
            <div class="cell auto">
              <ReportTab :state="state" tabName="expenses" />
            </div>
            <div class="cell auto">
              <ReportTab :state="state" tabName="net" />
            </div>
          </div>
        </div>

        <!-- Category Rows -->
        <Transition>
        <div v-if="!state.isLoading && state.is('home')" class="cell-1">
          <AccountCategories :state="state" />
        </div>
        </Transition>



        <Transition>
        <LoadingDots v-if="state.isLoading"></LoadingDots>
        </Transition>

      </div>
    </div>

    <!-- Right Side: Date and Selected Category Details List -->
    <div id="rightPanel" class="cell-3-5">

      <!-- Date Pickers -->
      <div class="grid middle">
        <div class="cell-10-24 section line50 b-bottom">
          <DatePicker :date="state.date" when="start" />
        </div>
        <div class="cell-4-24 bold section line50 b-bottom">thru</div>
        <div class="cell-10-24 section line50 b-bottom">
          <DatePicker :date="state.date" when="end" />
        </div>
      </div>

      <!-- Selected Category Details List -->
      <SelectedItems v-if="state.selectedTab.categoryName" :state="state" :categoryName="state.selectedTab.categoryName" class="p10" />

      <Transition>
      <div v-if="!state.selectedTab.items.length" class="cell-1 panel p30 text-center">        
        <b>« Choose an account and category to see detailed transactions here</b>
      </div>
      </Transition>

    </div>

  </div>

    <!-- AccountList -->
  <Transition>
    <AccountList v-if="state.is('accountList')" :state="state"></AccountList>
  </Transition>
</template>

<script setup>
  import { computed, onMounted, nextTick, reactive, watch } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import AccountList from '../components/AccountList.vue';
  import DatePicker from '../components/DatePicker.vue';
  import ReportTab from '../components/ReportTab.vue';
  import AccountCategories from '../components/AccountCategories.vue';
  import SelectedItems from '../components/SelectedItems.vue';
  import ScrollingContent from '../components/ScrollingContent.vue';
  import { useAppStore } from '../stores/app';

  const { api, State, sticky } = useAppStore();

  onMounted(() => {
    sticky.stickify('.totalsRow');
  });

  const state = reactive({
    date: {
      start: 'firstOfMonth',
      end: 'today'
    },
    elems: {
      body: document.documentElement.style,
      topNav: document.querySelector('.topNav').style
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
    selectedTab: {
      account: null,
      categoryName: null,
      tabName: 'income',
      allTransactions: [],
      items: []
    },
    sorted: {},
    totals: {
      income: 0, expenses: 0, net: 0
    },
    userAccounts: [],
    view: 'home'
  });

  const acctName = computed(() => {
    const { selectedTab } = state;

    return selectedTab.account?.subtype ? 
      `#${selectedTab.account.mask}` 
      : `<span class="underline">Account</span>`
  });

  const app = function() {
    function changeBgColor(color) {
      const { elems } = state;

      elems.topNav.backgroundColor = elems.body.backgroundColor = color;
    }

    function extractDate() {
      const { date : { start, end } } = state;

      return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
    }

    async function fetchTransactions({ account_id, date, select }) {
      account_id = account_id || state.selectedTab?.account?.account_id;
      date = date || extractDate();

      if(!account_id || !date) {
        return;
      }

      let url = `api/plaid/transactions?account_id=${account_id}&date=${date}`;

      if(select) {
        url += `&select=${select}`;
      };

      return await api.get(url);
    }

    async function fetchUserAccounts() {
      const items = await api.get('api/plaid/accounts');

      state.userAccounts = state.userAccounts.concat(items);
    }

    function getCategoryName(item) {
      const { category } = item;

      if(!category) {
        return;
      }

      return category.split(',')[0];
    }

    function isAnExpense({ amount }) {
      const numericAmount = Number(amount);

      return numericAmount > 0;
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
    
    function selectAccount(index) {
      const { userAccounts } = state;

      if(!userAccounts.length) {
        return;
      }

      state.selectedTab.account = userAccounts[index];
    }

    function sortByDate(data) {
      return data.sort((a, b) => b?.date?.localeCompare(a?.date));
    }

    function sortAndTotalAllSelectedTransactions(presets={}) {
      const { byCategory=true, byDate=true, reverseOrder=false } = presets;
      const { allTransactions } = state.selectedTab;
      
      if(!allTransactions) {
        return;
      }
      
      const sorted = {
        income: {},
        expenses: {}
      };

      let unSorted = [...allTransactions];

      state.totals = { income: 0, expenses: 0, net: 0 };

      if(byDate) {
        unSorted = sortByDate(unSorted);
      }

      if(reverseOrder) {
        unSorted.reverse();
      }

      for(const item of unSorted) {
        const transactionType = isAnExpense(item) ? 'expenses' : 'income';

        if(byCategory) {
          const categoryName = getCategoryName(item);

          (sorted[transactionType][categoryName] ??= []).push(item);
        } else {
          sorted[transactionType].push(item);
        }

        state.totals[transactionType] += parseFloat(item.amount);
      }

      return sorted;
    }

    function yyyyMmDd(dateObject) {
      const year = dateObject.getFullYear();
      const month = String(dateObject.getMonth() + 1).padStart(2, '0');
      const day = String(dateObject.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }

    return {
      fetchTransactionsForSelectedDate: async () => {
        const { account_id } = state.selectedTab.account || {};

        if(!account_id) {
          return;
        }

        state.isLoading = true;
        const date = extractDate();
        state.selectedTab.allTransactions = await fetchTransactions({ account_id, date });

        nextTick(() => state.isLoading = false);
      },
      init: async () => {
        changeBgColor('rgb(243, 243, 238)');  
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');
        await fetchUserAccounts();
        selectAccount(0);
      },
      handleAccountChange: async () => {
        app.resetSelectedTab();
        await app.fetchTransactionsForSelectedDate();
        state.sorted = sortAndTotalAllSelectedTransactions();
        state.totals.net = state.totals.income + state.totals.expenses;
      },
      resetSelectedTab: () => {
        state.selectedTab.categoryName = null;
        state.selectedTab.items = [];
      }
    }
  }();

  app.init();

  watch(() => state.selectedTab.tabName, app.resetSelectedTab);
  watch(() => state.selectedTab.account, app.handleAccountChange);
  watch(() => state.date.start, app.handleAccountChange);
  watch(() => state.date.end, app.handleAccountChange);

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