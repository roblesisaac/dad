<template>
  <transition>
    <div v-if="state.action && !state.forgotPassword" class="max-w-md mx-auto p-8">
      <form @submit.prevent="app.loginNative" class="space-y-6">
        <fieldset>
          <legend class="text-xl font-semibold capitalize mb-6">{{ state.action }}</legend>
          
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
              <input 
                id="email" 
                v-model="state.login.email" 
                autocomplete="email" 
                type="text"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <input 
                id="password" 
                v-model="state.login.password" 
                autocomplete="current-password" 
                type="password"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div v-if="state.action=='signup'">
              <label for="retype" class="block text-sm font-medium text-gray-700">Re-Type Password</label>
              <input 
                id="retype" 
                v-model="state.login.retype" 
                autocomplete="current-password" 
                type="password"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </fieldset>

        <button 
          type="submit" 
          class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {{ state.action }}
          <LoadingDots v-if="state.loginLoading" />
          <i v-else class="ml-2 fi-arrow-right"></i>
        </button>

        <div class="flex justify-between text-sm">
          <a href="#" @click="router.push('recover')" class="text-gray-600 hover:text-gray-900">
            Forgot Password
          </a>
          <a 
            href="#" 
            class="text-blue-600 hover:text-blue-800"
            v-if="state.action=='login'" 
            @click="app.changeAction('signup')"
          >
            Signup
          </a>
          <a 
            href="#" 
            class="text-blue-600 hover:text-blue-800"
            v-else 
            @click="app.changeAction('login')"
          >
            Login
          </a>
        </div>

        <div 
          v-if="state.notification" 
          class="mt-4 p-4 bg-red-500 text-white rounded-md shadow text-center"
          v-html="state.notification"
        ></div>

        <div class="relative mt-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or {{ state.action }} with Google</span>
          </div>
        </div>

        <button 
          type="button"
          @click="app.loginWithGoogle"
          class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <img alt="Google logo" src="/google.svg" class="h-5 w-5 mr-2" />
          <span class="capitalize">{{ state.action }}</span>
        </button>
      </form>
    </div>
  </transition>
</template>

<script setup>
import { reactive, nextTick } from 'vue';
import { router } from '@/main';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import { isValidEmail } from '@/utils';
import { useAppStore } from '@/stores/state';
const { api, utils } = useAppStore();

const state = reactive({
  action: 'login',
  baseUrl: '/api',
  loginLoading: null,
  login: {
    email: '',
    password: '',
    retype: ''
  },
  notification: null,
  recaptcha: null,
  recaptchaToken: null,
  siteKey: import.meta.env.VITE_RECAPTCHA_KEY
});

const app = {
  changeAction(changeTo) {
    state.action = null;
    nextTick(() => {
      state.action = changeTo;
    });
  },
  init() {
    utils.initRecaptcha();
  },
  loginWithGoogle() {
    window.location = state.baseUrl+'/login/auth/google';
  }
};

app.init();
</script>