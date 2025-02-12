import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import auth0 from './utils/auth.js';
import App from './App.vue';
import '@fontsource/fira-code';
import '@fontsource/fira-code/700.css';
import '@vuepic/vue-datepicker/dist/main.css';

const pinia = createPinia();
const app = createApp(App);

app.use(router)
   .use(pinia)
   .use(auth0)
   .mount('#app');

export { router };