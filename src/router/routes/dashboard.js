import { authGuard } from '@auth0/auth0-vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'

export const dashboardRoutes = [
  {
    path: '/dashboard',
    component: DashboardLayout,
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