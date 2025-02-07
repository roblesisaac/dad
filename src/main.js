import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';
import '@fontsource/fira-code';
import '@fontsource/fira-code/700.css';
import '@vuepic/vue-datepicker/dist/main.css';

const views = import.meta.glob([
  './views/*.vue',
  './features/SpendingReport.vue'
]);

const routerPromise = new Promise((resolve) => {
  const routes = [];

  for (const path in views) {
    let name = path.match(/\/([^/]+)\.vue$/)[1];

    views[path]().then(module => {
        name = name.toLowerCase();
        name = name.replace('vue', '');

        if(name === 'index') name = '';
        if(name === 'spendingreport') name = 'spendingreport';

        const path = `/${name}`;
        const component = module.default;
    
        routes.push({ path, component });

        if (Object.keys(views).length === routes.length) {
          resolve(routes);
        }
    });
  }
});

let router;

routerPromise.then(routes => {
  router = createRouter({
    history: createWebHistory(),
    routes
  });

  const pinia = createPinia();
  const app = createApp(App);

  app.use(router)
    .use(pinia)
    .mount('#app');
});

export { router };