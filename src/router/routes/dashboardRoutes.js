import { authGuard } from '@auth0/auth0-vue'

export default [
  {
    path: '/dashboard',
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
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/features/onboarding/views/OnboardingView.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      title: 'Connect Your Bank'
    }
  },
  {
    path: '/reconnect',
    name: 'reconnect',
    component: () => import('@/features/onboarding/views/ItemRepair.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      title: 'Reconnect Your Bank'
    }
  }
]; 