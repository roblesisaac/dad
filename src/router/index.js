import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('@/shared/components/LoginView.vue')
const CallbackView = () => import('@/shared/components/CallbackView.vue')
const IndexVue = () => import('@/views/IndexVue.vue')
const LoginVue = () => import('@/views/LoginVue.vue')
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue')
const RecoverVue = () => import('@/views/RecoverVue.vue')
const SettingsVue = () => import('@/views/SettingsVue.vue')
const SwiperVue = () => import('@/views/SwiperVue.vue')
const TermsOfService = () => import('@/views/TermsOfService.vue')
const VerifyVue = () => import('@/views/VerifyVue.vue')
const SpendingReport = () => import('@/features/dashboard/SpendingReport.vue')

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
  },
  {
    path: '/spendingreport',
    name: 'spending-report',
    component: SpendingReport
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 