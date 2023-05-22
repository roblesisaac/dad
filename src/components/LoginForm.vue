<template>
  <transition>
  <div v-if="action" class="grid p30">
    <div class="cell-1">
      {{  cart.total }}
      <br>
      {{  cart.items }}
      <form @submit.prevent="loginNative" class="grid r10">         
        <fieldset class="cell-1">
            <div class="grid">
              <div class="cell-1">                
                <legend class="proper center">{{ action }}</legend>
              </div>
              <div class="cell-1 p10b">
                <div class="grid middle">
                  <div class="cell-1">
                    <label for="email">Email</label>
                    <input id="email" v-model="login.email" autocomplete="email" type="text" />
                  </div>
                </div>
              </div>
              <div class="cell-1 p30b">
                <div class="grid">
                  <div class="cell-1">                  
                    <label for="password">Password</label>
                    <input id="password" v-model="login.password" autocomplete="current-password" type="password" />
                  </div>
                </div>
              </div>
              <div v-if="action=='signup'" class="cell-1 p30b">
                <div class="grid">
                  <div class="cell-1">                  
                    <label for="retype">Re-Type Password</label>
                    <input id="retype" v-model="login.retype" autocomplete="current-password" type="password" />
                  </div>
                </div>
              </div>
            </div>
        </fieldset>
        <div class="cell-1 p10b center">
          <button type="submit" class="expanded proper">
            {{ action }} <LoadingDots v-if="loginLoading"></LoadingDots><i v-else class="fi-arrow-right"></i>
          </button>
        </div>
        <div v-if="action=='login'" class="cell-1 center">
          <small>Don't have an account? <a href="#" @click="changeAction('signup')">Sign up »</a></small>
        </div>
        <div v-else class="cell-1 center">
          <small>Already have an account? <a href="#" @click="changeAction('login')">Login »</a></small>
        </div>
        <br /><br />
        <Transition>
          <div v-if="notification" class="cell-1 center bgRed colorF1 r3 shadow p15" v-html="notification"></div>
        </Transition>
      </form>
    </div>
    <div class="cell-1 center bold p20y">- OR -</div>
    <div class="cell-1 center">
      <button class="bgF3 colorDarkBlue expanded" @click="loginWithGoogle">
        <img alt="Vue logo" src="../assets/google.svg" height="20" class="p10r" />
        <span class="proper">{{ action }}</span> with Google
      </button>
    </div>
  </div>
  </transition>
</template>
  
<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { load } from 'recaptcha-v3';

import LoadingDots from './LoadingDots.vue';
import { isValidEmail } from '../utils';
import { useAppStore } from '../stores/app';
const { api, cart } = useAppStore();

cart.addItem({ sku: 1234, price: 10, qty: 2 });

setTimeout(() => cart.addItem({ sku: 1235, price: 30, qty: 3 }), 2000);

const login = ref({
  email: '',
  password: '',
  retype: ''
});

let action = ref('login');
let notification = ref('');

const baseUrl = '/api';
const siteKey = import.meta.env.VITE_RECAPTCHA_KEY;
let recaptcha,
    recaptchaToken,
    loginLoading = ref(false);

function changeAction(changeTo) {
  action.value = null;

  nextTick(() => {
    action.value = changeTo;
  });
}

function notify(message) {
  if(!message) {
    return;
  }

  notification.value = message;
  loginLoading.value = false;
  
  setTimeout(() => {
    notification.value = false;
  }, 4000);
}

async function loginNative() {
  loginLoading.value = true;

  if(!recaptcha) {
    return;
  }

  recaptchaToken = await recaptcha.execute('login');

  const method = action.value;
  const { email, password, retype } = login.value;

  if(!email || !password) {
    return notify('Missing email or password');
  }

  if(password.length<8) {
    return notify('Password must be at least 8 character.');
  }

  if(method == 'signup' && password !== retype) {
    return notify('Passwords must match.');
  }

  if(!isValidEmail(email)) {
    return notify(`The email <b>${email}</b> is invalid. Please enter a valid email address.`);
  }

  if(method) {
    delete method.retype;
  }
  
  const url =  baseUrl + `/${method}/native`;
  const body = { recaptchaToken, ...login.value };
  const settings = { freshRedirect: true };

  await api.post(url, body, settings).then(notify);
  loginLoading.value = false;
}

function loginWithGoogle() {
  window.location = baseUrl+'/login/auth/google';
}

onMounted(async () => {
  recaptcha = await load(siteKey);
  if(loginLoading.value) loginNative();
});
</script>