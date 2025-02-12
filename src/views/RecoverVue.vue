<template>
	<form @submit.prevent="app.requestPasswordReset" class="grid middle p20">
		<div class="cell-1 p30b left">
			<a href="#" @click="router.push('login')">Back</a>
		</div>
		<div class="cell-1 p30t">
			<div class="grid middle">
				<div class="cell-1">
					<label for="forgotEmail">Email</label>
					<input id="forgotEmail" v-model="state.email" autocomplete="email" type="text" />
				</div>
			</div>
			<div class="cell-1 p10y center">
				<button type="submit" class="expanded proper">
					Request New Password <LoadingDots v-if="state.loginLoading"></LoadingDots><i v-else class="fi-arrow-right"></i>
				</button>
			</div>
		</div>
		
	</form>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { load } from 'recaptcha-v3';

import { router } from '../main';
import LoadingDots from '../shared/components/LoadingDots.vue';
import { isValidEmail } from '../utils';
import { useAppStore } from '@/stores/state';
const { api } = useAppStore();

const { value:state } = ref({
	basePath: '/api/requestpasswordreset/',
	email: null,
	loginLoading: false,
	recaptcha: null,
	recaptchaToken: null,
	siteKey: import.meta.env.VITE_RECAPTCHA_KEY
});

const app = function() {
	const buildUrl = () => state.basePath+state.email;
	
	return {
		async initRecaptcha() {
			state.recaptcha = await load(state.siteKey);
		},
		requestPasswordReset: async () => {
			state.loginLoading = true;
			
			if(!state.recaptcha) {
				return;
			}
			
			if(!isValidEmail(state.email)) {
				console.log('not valid email');
				return;
			}
			
			const url = buildUrl();
			const response = await api.post(url, {}, { checkHuman: true });
			
			console.log(response);
		}
	}
}();

onMounted(async () => {
	await app.initRecaptcha();
});


</script>