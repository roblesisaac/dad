<template>
  <!-- BackButton -->
  <Transition>
    <button @click="state.view='home'" v-if="!state.is(['home', 'loading'])" class="acctButton section b-bottom"><ChevronLeft class="icon" /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    <!-- Pickers -->
    <div class="cell-1">
      <div class="grid middle">
        <div class="cell-6-24 section b-bottom b-right line50">
          <button @click="state.view='acctList'" class="acctButton section-content proper" href="#" v-html="acctName">
          </button>
        </div>
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

    <!-- Totals -->
    <div class="cell-1 totalsRow">
      <div class="grid">
        <div class="cell auto">
          <ReportTab :state="state" name="income" />
        </div>
        <div class="cell auto">
          <ReportTab :state="state" name="expenses" />
        </div>
        <div class="cell auto">
          <ReportTab :state="state" name="net" />
        </div>
      </div>
    </div>

    <!-- Category Rows -->
    <Transition>
      <div v-if="!state.isLoading" class="cell-1">
        <AccountCategories :state="state" />
      </div>
    </Transition>
    <Transition>
      <LoadingDots v-if="state.isLoading"></LoadingDots>
    </Transition>
  </div>

  <!-- Not Small Screens -->
  <div v-if="!state.isSmallScreen() && state.is('home')" class="grid middle">
    <div class="cell-shrink section b-right b-bottom">
    </div>
  </div>
 

  <!-- DatePicker -->
  <Transition>
    <DatePicker v-if="state.is('date')"></DatePicker>
  </Transition>

    <!-- AccountList -->
  <Transition>
    <AccountList v-if="state.is('acctList')" :state="state"></AccountList>
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
    selected: {
      account: null,
      tab: 'income',
      transactions: [],
      items: {}
    },
    sorted: {},
    userAccounts: [],
    view: 'home'
  });

  const acctName = computed(() => {
    const { selected } = state;

    return selected.account?.subtype ? 
      `#${selected.account.mask}` 
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
      account_id = account_id || state.selected?.account?.account_id;
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
      const fetchedAccounts = await api.get('api/plaid/accounts');

      state.userAccounts = state.userAccounts.concat(fetchedAccounts);
    }

    function isAnExpense({ amount }) {
      const numericAmount = Number(amount);

      return numericAmount < 0;
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

      state.selected.account = userAccounts[index];
    }

    function sortByCategory(data) {
      const categorized = {
        income: {},
        expenses: {}
      };

      for(const item of data) {
        const { category } = item;

        if(!category) {
          continue;
        }

        const catName = category.split(',')[0];
        const transactionType = isAnExpense(item) ? 'expenses' : 'income';

        (categorized[transactionType][catName] ??= []).push(item);
      }

      return categorized;
    }

    function sortByDate(data) {
      return data.sort((a, b) => a.date.localeCompare(b.date));
    }

    function sortSelectedTransactions({ category=true, date=true, reverse=false }={}) {
      const { transactions } = state.selected;
      
      if(!transactions) {
        return;
      }

      let sorted = [...transactions];

      if(date) {
        sorted = sortByDate(sorted);
      }

      if(reverse) {
        sorted.reverse();
      }

      if(category) {
        sorted = sortByCategory(sorted);
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
        const { account_id } = state.selected.account || {};

        if(!account_id) {
          return;
        }
        state.isLoading = true;
        const date = extractDate();
        state.selected.transactions = await fetchTransactions({ account_id, date });
        nextTick(() => state.isLoading = false);
      },
      init: async () => {
        changeBgColor('rgb(243, 243, 238)');  
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js');
        await fetchUserAccounts();
        selectAccount(0);
      },
      handleAccountChange: async () => {
        await app.fetchTransactionsForSelectedDate();
        state.sorted = sortSelectedTransactions();
      }
    }
  }();

  app.init();

  watch(() => state.selected.account, app.handleAccountChange);
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

.section {
  height: 50px;
}

.section.b-right {
  border-right: 2px solid #000;
}

.section.b-left {
  border-left: 2px solid #000;
}

.section.b-bottom {
  border-bottom: 2px solid #000;
}

.section.b-top {
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