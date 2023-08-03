<template>
  <!-- Small Screens -->
  <div v-if="state.isSmallScreen() && state.is('ready')" class="grid middle">
    <!-- Pickers -->
    <div class="cell-1">
      <div class="grid middle">
        <div class="cell auto section b-bottom b-right line50">
          <AccountSelector :state="state" />
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
</template>

<script setup>
  import { reactive } from 'vue';
  import LoadingDots from '../components/LoadingDots.vue';
  import AccountSelector from '../components/AccountSelector.vue';
  import DatePicker from '../components/DatePicker.vue';
  import TotalCalc from '../components/TotalCalc.vue';
  import { useAppStore } from '../stores/app';

  const { State } = useAppStore();

  const state = reactive({
    account: null,
    body: document.documentElement.style,
    date: {
      start: 'firstOfMonth',
      end: 'today'
    },
    state: [],
    is(status) {
      return this.status === status;
    },
    isSmallScreen() {
      return State.currentScreenSize() === 'small'
    },
    status: 'ready',
    topNav: document.querySelector('.topNav').style
  });

  const app = function() {
    function changeBgColor(color) {
      state.topNav.backgroundColor = state.body.backgroundColor = color;
    }

    function changeFont(fontFamily) {
      document.body.style.fontFamily = fontFamily;
    }

    return {
      init: async () => {
        changeBgColor('#fffbef');
        changeFont('Consolas, monospace')
      }
    }
  }();

  app.init();

</script>

<style>
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