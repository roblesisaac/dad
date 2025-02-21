import { authGuard } from '@auth0/auth0-vue'

export const dashboardRoutes = [
  {
    path: '/dashboard',
    component: { template: '<router-view></router-view>' }, // Use simple wrapper for now
    beforeEnter: authGuard,
    children: [
      {
        path: 'onboarding',
        name: 'onboarding',
        component: () => import('@/features/dashboard/views/OnboardingView.vue'),
        meta: {
          requiresAuth: true,
          title: 'Connect Your Bank'
        }
      },
      {
        path: 'spending-report',
        name: 'spending-report',
        component: () => import('@/features/dashboard/SpendingReport.vue'),
        meta: {
          requiresAuth: true,
          requiresPlaidItems: true,
          title: 'Spending Report'
        }
      },
      {
        path: 'repair',
        name: 'repair',
        component: () => import('@/features/dashboard/components/ItemRepair.vue'),
        meta: {
          requiresAuth: true,
          title: 'Fix Connection'
        }
      }
    ]
  }
]; 