import { defineStore } from 'pinia';
import { reactive } from 'vue';

import api from './tools/api';
import sticky from './tools/sticky';
import cart from './tools/cart';
import utils from './tools/utils';

const state = reactive({
  recaptcha: null
});

export const useAppStore = defineStore('state', () => ({
  api: api(state),
  utils: utils(state),
  cart,
  sticky,
  state
}));