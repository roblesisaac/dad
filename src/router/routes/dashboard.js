import { defineAsyncComponent } from 'vue';

export default [
  {
    path: '/onboarding',
    name: 'onboarding',
    component: defineAsyncComponent(() => 
      import('../features/dashboard/views/OnboardingStatus.vue')
    ),
    meta: {
      requiresAuth: true,
      title: 'Connect Your Bank'
    }
  },
  {
    path: '/spending-report',
    name: 'spending-report',
    component: defineAsyncComponent(() => 
      import('../features/dashboard/views/SpendingReportView.vue')
    ),
    meta: {
      requiresAuth: true,
      requiresPlaidItems: true,
      title: 'Spending Report'
    }
  }
]; 