import { createRouter, createWebHistory } from 'vue-router'
import dashboardRoutes from './routes/dashboard.js'

const CallbackView = () => import('@/shared/components/CallbackView.vue')
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue')
const TermsOfService = () => import('@/views/TermsOfService.vue')
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
    path: '/terms',
    name: 'terms',
    component: TermsOfService
  },
  {
    path: '/',
    name: 'root',
    component: Landing
  },
  ...dashboardRoutes,
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 