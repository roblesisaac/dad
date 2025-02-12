<template>
  <Transition>
    <button v-if="!state.is(['home'])" @click="app.goBack" class="backButton section b-bottom">
      <ChevronLeft class="icon" /> Back
    </button>
  </Transition>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, watch } from 'vue';
import { ChevronLeft } from 'lucide-vue-next';
import AllTabs from '../components/AllTabs.vue';
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

// ... rest of the script
</script> 