import { authGuard } from '@auth0/auth0-vue'

export default [
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/features/dashboard/components/ItemRepair.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      title: 'Connect Your Bank'
    }
  },
  {
    path: '/spending-report',
    name: 'spending-report',
    component: () => import('@/features/dashboard/SpendingReport.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      requiresPlaidItems: true,
      title: 'Spending Report'
    }
  }
]; 