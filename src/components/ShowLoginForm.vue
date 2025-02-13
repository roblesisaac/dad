<template>
  <div class="fixed inset-x-0 bottom-0 bg-white shadow-lg">
    <div class="max-w-lg mx-auto p-6">
      <form @submit.prevent="login" class="space-y-4">         
        <fieldset>
          <legend class="text-xl font-semibold mb-4">Log Back In?</legend>
          
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
          </div>
        </fieldset>

        <button 
          type="submit" 
          class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Login <LoadingDots v-if="state.loginLoading" /><i v-else class="ml-2 fi-arrow-right"></i>
        </button>

        <Transition>
          <div 
            v-if="state.notification" 
            class="p-4 bg-red-500 text-white rounded-md shadow text-center"
            v-html="state.notification"
          ></div>
        </Transition>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { isValidEmail } from '@/utils';
import { useAppStore } from '@/stores/state';
import LoadingDots from '@/shared/components/LoadingDots.vue';

const { api, State } = useAppStore();

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