import { defineStore } from 'pinia';
import { ref } from 'vue';

import api from './utils/api';
import sticky from './utils/sticky';
import cart from './utils/cart';

const state = ref({});

export const useAppStore = defineStore('state', () => ({
    api: api(state),
    cart,
    sticky,
    state
}));