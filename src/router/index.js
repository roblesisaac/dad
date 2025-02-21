import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from '@auth0/auth0-vue'
import dashboardRoutes from './routes/dashboard.js'

const CallbackView = () => import('@/shared/components/CallbackView.vue')
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue')
const SwiperVue = () => import('@/views/SwiperVue.vue')
const TermsOfService = () => import('@/views/TermsOfService.vue')
const SpendingReport = () => import('@/features/dashboard/SpendingReport.vue')
const Landing = () => import('@/views/Landing.vue')

const routes = [
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
    path: '/',
    name: 'landing',
    component: Landing
  },
  ...dashboardRoutes
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 