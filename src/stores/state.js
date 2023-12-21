import { defineStore } from 'pinia';
import { reactive, ref, watchEffect } from 'vue';

import api from './tools/api';
import stickify from './tools/stickify';
import cart from './tools/cart';
import utils from './tools/utils';
import Session from './tools/session';

export const State = reactive({
	showingOffCanvasLinks: false,
  	recaptcha: null,
	lastTouched: null,
	showLoginForm: false,
	showStayLoggedInForm: false,
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
	api: api(State),
	utils: utils(State),
	cart,
	stickify,
	State,
	Session: Session(State)
}));