import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import auth0 from './shared/utils/auth.js';
import App from './App.vue';
import '@fontsource-variable/sometype-mono';
// import '@vuepic/vue-datepicker/dist/main.css';
// import './css/tailwind.css';

const pinia = createPinia();
const app = createApp(App);

app.use(router)
   .use(pinia)
   .use(auth0)
   .mount('#app');

export { router };