import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../components/LoginView.vue'
import CallbackView from '../components/CallbackView.vue'
import IndexVue from '../views/IndexVue.vue'
import LoginVue from '../views/LoginVue.vue'
import PrivacyPolicy from '../views/PrivacyPolicy.vue'
import RecoverVue from '../views/RecoverVue.vue'
import SettingsVue from '../views/SettingsVue.vue'
import SwiperVue from '../views/SwiperVue.vue'
import TermsOfService from '../views/TermsOfService.vue'
import VerifyVue from '../views/VerifyVue.vue'

const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexVue
  },
  {
    path: '/login',
    name: 'login',
    component: LoginVue
  },
  {
    path: '/auth/login',
    name: 'auth-login',
    component: LoginView
  },
  {
    path: '/callback',
    name: 'callback',
    component: CallbackView
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: PrivacyPolicy
  },
  {
    path: '/recover',
    name: 'recover',
    component: RecoverVue
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsVue
  },
  {
    path: '/swiper',
    name: 'swiper',
    component: SwiperVue
  },
  {
    path: '/terms',
    name: 'terms',
    component: TermsOfService
  },
  {
    path: '/verify',
    name: 'verify',
    component: VerifyVue
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 