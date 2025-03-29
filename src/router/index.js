import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from '@auth0/auth0-vue'

const CallbackView = () => import('@/shared/components/CallbackView.vue')
const PrivacyPolicy = () => import('@/shared/views/PrivacyPolicy.vue')
const TermsOfService = () => import('@/shared/views/TermsOfService.vue')
const Landing = () => import('@/shared/views/Landing.vue')

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
    name: 'dashboard',
    component: () => import('@/features/dashboard/views/Dashboard.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      requiresPlaidItems: true,
      title: 'Spending Report'
    }
  },
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