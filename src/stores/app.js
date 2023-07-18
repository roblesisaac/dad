import { defineStore } from 'pinia';
import { reactive, ref, watchEffect } from 'vue';

import api from './tools/api';
import sticky from './tools/sticky';
import cart from './tools/cart';
import utils from './tools/utils';

const state = reactive({
  recaptcha: null,
	currentScreenSize() {
		const screenSize = ref('large');
		const small = '(max-width: 47.9375em)';
		const medium = '(min-width: 48em) and (max-width: 63.9375em)';
	
		const updateScreenSize = () => {
			const matches = (media) => window.matchMedia(media).matches;
	
			screenSize.value = matches(small)
				? 'small'
				: matches(medium)
				? 'medium'
				: 'large';
		};
	
		watchEffect(() => {
			window.matchMedia(small).addEventListener('change', updateScreenSize);
			window.matchMedia(medium).addEventListener('change', updateScreenSize);
			updateScreenSize();
		});
	
		return screenSize.value;
	}
});

export const useAppStore = defineStore('state', () => ({
  api: api(state),
  utils: utils(state),
  cart,
  sticky,
  state
}));