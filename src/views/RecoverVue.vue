<template>
	<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
		<div class="sm:mx-auto sm:w-full sm:max-w-md">
			<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
				<!-- Back Link -->
				<div class="mb-6">
					<button 
						@click="router.push('login')"
						class="text-blue-600 hover:text-blue-700 font-medium flex items-center"
					>
						<ChevronLeft class="w-5 h-5 mr-1" />
						Back to Login
					</button>
				</div>

				<!-- Recovery Form -->
				<form @submit.prevent="app.requestPasswordReset" class="space-y-6">
					<div>
						<label 
							for="forgotEmail" 
							class="block text-sm font-medium text-gray-700"
						>
							Email Address
						</label>
						<div class="mt-1">
							<input
								id="forgotEmail"
								v-model="state.email"
								type="email"
								autocomplete="email"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							:disabled="state.loginLoading"
						>
							<span v-if="!state.loginLoading">
								Request New Password
								<ArrowRight class="ml-2 w-4 h-4" />
							</span>
							<LoadingDots v-else />
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { load } from 'recaptcha-v3';
import { router } from '@/main';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { isValidEmail } from '@/utils';
import { useAppStore } from '@/stores/state';
import { ChevronLeft, ArrowRight } from 'lucide-vue-next';

const { api } = useAppStore();

const { value: state } = ref({
	basePath: '/api/requestpasswordreset/',
	email: null,
	loginLoading: false,
	recaptcha: null,
	recaptchaToken: null,
	siteKey: import.meta.env.VITE_RECAPTCHA_KEY
});

const app = {
	async initRecaptcha() {
		state.recaptcha = await load(state.siteKey);
	},
	requestPasswordReset: async () => {
		if (!state.recaptcha || !isValidEmail(state.email)) return;

		state.loginLoading = true;
		try {
			const url = state.basePath + state.email;
			const response = await api.post(url, {}, { checkHuman: true });
			console.log(response);
		} catch (error) {
			console.error('Password reset request failed:', error);
		} finally {
			state.loginLoading = false;
		}
	}
};

onMounted(async () => {
	await app.initRecaptcha();
});
</script>