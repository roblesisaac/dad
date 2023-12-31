<template>
  <transition>
    <div v-if="state.action && !state.forgotPassword" class="grid p30">
      <div class="cell-1">
        <form @submit.prevent="app.loginNative" class="grid r10">         
          <fieldset class="cell-1">
            <div class="grid">
              <div class="cell-1">                
                <legend class="proper left">{{ state.action }}</legend>
              </div>
              <div class="cell-1 p10b">
                <div class="grid middle">
                  <div class="cell-1">
                    <label for="email">Email</label>
                    <input id="email" v-model="state.login.email" autocomplete="email" type="text" />
                  </div>
                </div>
              </div>
              <div class="cell-1 p30b">
                <div class="grid">
                  <div class="cell-1">                  
                    <label for="password">Password</label>
                    <input id="password" v-model="state.login.password" autocomplete="current-password" type="password" />
                  </div>
                </div>
              </div>
              <div v-if="state.action=='signup'" class="cell-1 p30b">
                <div class="grid">
                  <div class="cell-1">                  
                    <label for="retype">Re-Type Password</label>
                    <input id="retype" v-model="state.login.retype" autocomplete="current-password" type="password" />
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
          <div class="cell-1 p10b center">
            <button type="submit" class="expanded proper">
              {{ state.action }} <LoadingDots v-if="state.loginLoading"></LoadingDots><i v-else class="fi-arrow-right"></i>
            </button>
          </div>
          <div class="cell-1 p10t">
            <div class="grid">
              <div class="cell-1-2 text-left">
                <a href="#" @click="router.push('recover')" class="colorDarkestGray">Forgot Password</a>
              </div>
              <div class="cell-1-2 text-right">
                <a href="#" v-if="state.action=='login'" @click="app.changeAction('signup')">
                  Signup
                </a>
                <a href="#" v-else @click="app.changeAction('login')">
                  Login
                </a>
              </div>
            </div>
          </div>
          <br /><br />
          <Transition>
            <div v-if="state.notification" class="cell-1 center bgRed colorF1 r3 shadow p15" v-html="state.notification"></div>
          </Transition>
        </form>
      </div>
      <div class="cell-1 center proper divider">
        <hr>
        <p class="divider-text">Or {{ state.action }} with Google</p>
      </div>
      <div class="cell-1 center">
        <button class="bgF3 bgBlack expanded" @click="app.loginWithGoogle">
          <img alt="Vue logo" src="../assets/google.svg" height="20" class="p10r" />
          <span class="proper">{{ state.action }}</span>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { reactive, nextTick } from 'vue';

import { router } from '../main';
import LoadingDots from './LoadingDots.vue';
import { isValidEmail } from '../utils';
import { useAppStore } from '../stores/state';
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

const app = function() {  
  function buildUrl() {
    return state.baseUrl + `/${state.action}/native`
  }
  
  function notify(message) {
    if(!message) {
      return;
    }
    
    state.notification = message;
    state.loginLoading = false;
    
    setTimeout(() => {
      state.notification = null;
    }, 4000);
  }
  
  return {
    changeAction(changeTo) {
      state.action = null;
      
      nextTick(() => {
        state.action = changeTo;
      });
    },
    init() {
      utils.initRecaptcha();
    },
    async loginNative() {
      state.loginLoading = true;
  
    
      const { email, password, retype } = state.login;
      
      if(!email || !password) {
        return notify('Missing email or password');
      }
      
      if(password.length<8) {
        return notify('Password must be at least 8 character.');
      }
      
      const method = state.action;
      
      if(method == 'signup' && password !== retype) {
        return notify('Passwords must match.');
      }
      
      if(!isValidEmail(email)) {
        return notify(`The email <b>${email}</b> is invalid. Please enter a valid email address.`);
      }
      
      if(method == 'login') {
        delete state.login.retype;
      }
      
      const url = buildUrl();
      const settings = { reloadPage: true, checkHuman: true };
      
      await api.post(url, state.login, settings).then(notify);
      state.loginLoading = false;
    },
    loginWithGoogle() {
      window.location = state.baseUrl+'/login/auth/google';
    }
  }
}();

app.init();
</script>