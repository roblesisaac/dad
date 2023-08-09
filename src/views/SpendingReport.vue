<template>
  <!-- BackButton -->
  <Transition>
    <button @click="state.status='ready'" v-if="!state.is(['ready', 'loading'])" class="backButton section b-bottom"><ChevronLeft /> Back</button>
  </Transition>

  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('ready')" class="grid middle">
    <!-- Pickers -->
    <div class="cell-1">
      <div class="grid middle">
        <div class="cell auto section b-bottom b-right line50">
          <a @click="state.status='acctList'" class="section-content proper" href="#">
            {{ acctName }}
          </a>
        </div>
        <div class="cell auto section b-bottom line50">          
          <DatePicker :date="state.date" when="start" /> <b>thru</b> <DatePicker :date="state.date" when="end" />
        </div>
      </div>
    </div>

    <!-- Totals -->
    <div class="cell-1">
      <div class="grid">
        <div class="cell auto section b-bottom b-right">
          <TotalCalc :state="state" name="income" />
        </div>
        <div class="cell auto section b-bottom b-right">
          <TotalCalc :state="state" name="expenses" />
        </div>
        <div class="cell auto section b-bottom">
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
  <div v-if="!state.isSmallScreen() && state.is('ready')" class="grid middle">
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
  import { computed, reactive } from 'vue';
  import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import AccountList from '../components/AccountList.vue';
  import DatePicker from '../components/DatePicker.vue';
  import TotalCalc from '../components/TotalCalc.vue';
  import { useAppStore } from '../stores/app';

  const { api, State } = useAppStore();

  const state = reactive({
    account: null,
    body: document.documentElement.style,
    date: {
      start: 'firstOfMonth',
      end: 'today'
    },
    state: [],
    is(status) {
      const statuses = Array.isArray(status) ? status : [status];
      return statuses.includes(this.status);
    },
    isSmallScreen() {
      return State.currentScreenSize() === 'small'
    },
    linkToken: null,
    status: 'ready',
    topNav: document.querySelector('.topNav').style,
    userAccounts: ['orange']
  });

  const acctName = computed(() => state.account || 'Select Acct. »');

  const app = function() {
    function changeBgColor(color) {
      state.topNav.backgroundColor = state.body.backgroundColor = color;
    }

    function changeFont(fontFamily) {
      document.body.style.fontFamily = fontFamily;
    }

    async function fetchUserAccounts() {
      state.userAccounts = ['orange'];
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
        changeFont('Consolas, monospace');
        await loadScript('https://cdn.plaid.com/link/v2/stable/link-initialize.js')
        await fetchUserAccounts();
      }
    }
  }();

  app.init();

</script>

<style>
.backButton, .backButton:hover {
  background: transparent;
  color: black;
  box-shadow: none;
  width: 100%;
}

.backButton:hover {
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