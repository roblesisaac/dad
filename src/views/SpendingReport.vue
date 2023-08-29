<template>
  <!-- BackButton -->
  <Transition>
    <button @click="state.view='home'" v-if="!state.is(['home', 'loading'])" class="acctButton section b-bottom"><ChevronLeft /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('home')" class="grid middle">
    <!-- Pickers -->
    <div class="cell-1">
      <div class="grid middle">
        <div class="cell shrink section b-bottom b-right line50">
          <button @click="state.view='acctList'" class="acctButton section-content proper" href="#">
            {{ acctName }}
          </button>
        </div>
        <div class="cell auto section b-bottom line50">          
          <DatePicker :date="state.date" when="start" /> <b>thru</b> <DatePicker :date="state.date" when="end" />
        </div>
      </div>
    </div>

    <!-- Totals -->
    <div class="cell-1">
      <div class="grid">
        <div class="cell auto">
          <TotalCalc :state="state" name="income" />
        </div>
        <div class="cell auto">
          <TotalCalc :state="state" name="expenses" />
        </div>
        <div class="cell auto">
          <TotalCalc :state="state" name="net" />
        </div>
      </div>
    </div>

    <!-- Category Rows -->
    <div class="cell-1">
      <!-- <div class="grid"></div> -->
    </div>
  </div>

  <!-- Not Small Screens -->
  <div v-if="!state.isSmallScreen() && state.is('home')" class="grid middle">
    <div class="cell-shrink section b-right b-bottom">
    </div>
  </div>

  <!-- Loading -->
  <Transition>
    <LoadingDots v-if="state.is('loading')"></LoadingDots>
  </Transition>

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
  import { computed, reactive, watch } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import AccountList from '../components/AccountList.vue';
  import DatePicker from '../components/DatePicker.vue';
  import TotalCalc from '../components/TotalCalc.vue';
  import { useAppStore } from '../stores/app';

  const { api, State } = useAppStore();

  const state = reactive({
    body: document.documentElement.style,
    date: {
      start: 'firstOfMonth',
      end: 'today'
    },
    state: [],
    is(view) {
      const viewes = Array.isArray(view) ? view : [view];
      return viewes.includes(this.view);
    },
    isSmallScreen() {
      return State.currentScreenSize() === 'small'
    },
    linkToken: null,
    selectedAccount: null,
    selectedCalc: 'income',
    topNav: document.querySelector('.topNav').style,
    userAccounts: [],
    view: 'home'
  });

  const acctName = computed(() => 
    state.selectedAccount ? 
      `${state.selectedAccount.subtype} ${state.selectedAccount.mask}` 
      : 'Account »'
  );

  const app = function() {
    function changeBgColor(color) {
      state.topNav.backgroundColor = state.body.backgroundColor = color;
    }

    function changeFont(fontFamily) {
      document.body.style.fontFamily = fontFamily;
    }

    async function fetchUserAccounts() {
      const fetchedAccounts = await api.get('api/plaid/accounts');

      state.userAccounts = state.userAccounts.concat(fetchedAccounts);
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

    return {
      init: async () => {
        changeBgColor('#fffbef');
        // changeFont('Fira Code');
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js')
        await fetchUserAccounts();
      },
      handleViewChange: async (view) => {
        if(view !== 'home' || !state.selectedAccount) {
          return;
        }

        console.log(state)
      }
    }
  }();

  app.init();

  watch(() => state.view, app.handleViewChange);

</script>

<style>
.acctButton, .acctButton:hover {
  background: transparent;
  color: black;
  box-shadow: none;
  width: 100%;
}

.acctButton:hover {
  color: royalblue;
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
  color: blueviolet;
  font-weight: 900;
}
</style>