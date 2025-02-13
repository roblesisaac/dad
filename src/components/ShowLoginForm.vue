<template>
<div class="grid p30 log-in-popup">
  <div class="cell-1">
    <form @submit.prevent="login" class="grid r10">         
        <fieldset class="cell-1">
          <div class="grid">
            <div class="cell-1">                
              <legend class="proper left">Log Back In?</legend>
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
          </div>
        </fieldset>
        <div class="cell-1 p10b center">
          <button type="submit" class="expanded proper">
            Login <LoadingDots v-if="state.loginLoading"></LoadingDots><i v-else class="fi-arrow-right"></i>
          </button>
        </div>
        <Transition>
          <div v-if="state.notification" class="cell-1 center bgRed colorF1 r3 shadow p15" v-html="state.notification"></div>
        </Transition>
      </form>
  </div>
</div>
</template>

<script setup>
import { reactive } from 'vue';
import { isValidEmail } from '@/utils';
import { useApi } from '../shared/composables/useApi';
import { useAppStore } from '@/stores/state';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { State } = useAppStore();
const { api } = useApi();
const state = reactive({
  notification: false,
  loginLoading: false,
  login: {
    email: '',
    password: ''
  }
});

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

async function login() {
  state.loginLoading = true;    
  const { email, password} = state.login;

  if(!email || !password) {
    return notify('Missing email or password');
  }

  if(password.length<8) {
    return notify('Password must be at least 8 character.');
  }

  if(!isValidEmail(email)) {
    return notify(`The email <b>${email}</b> is invalid. Please enter a valid email address.`);
  }

  const url = 'api/login/native';
  const settings = { reloadPage: false, checkHuman: true };

  try {
    const response = await api.post(url, state.login, settings);
    if(response) {
      notify(response)
    } else {
      State.showLoginForm = false;
      document.body.classList.add('hide-recaptcha-badge');
    }
  } catch (error) {
    console.log({ error })
    notify(error);
  }
}
</script>

<style scoped>
.log-in-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
}
</style>