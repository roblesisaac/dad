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
    },
    children: [
      {
        path: 'select-group',
        name: 'select-group',
        component: () => import('@/features/select-group/views/SelectGroup.vue')
      },
      {
        path: 'edit-tab',
        name: 'edit-tab',
        component: () => import('@/features/edit-tab/views/EditTab.vue')
      },
      {
        path: 'rule-details',
        name: 'rule-details',
        component: () => import('@/features/dashboard/components/RuleDetails.vue'),
        props: true
      },
      {
        path: 'all-tabs',
        name: 'all-tabs',
        component: () => import('@/features/tabs/components/AllTabs.vue')
      }
    ]
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/features/onboarding/views/ItemRepair.vue'),
    beforeEnter: authGuard,
    meta: {
      requiresAuth: true,
      title: 'Connect Your Bank'
    }
  }
]; 