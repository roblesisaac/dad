<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
    <div class="space-y-12">
      <!-- Acceptance of Terms -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
        <div class="space-y-2 text-gray-600 leading-relaxed">
          <p>1.1. By accessing or using {{ state.appName }}'s services, you agree to comply with and be bound by these Terms of Service.</p>
          <p>1.2. If you do not agree with these Terms of Service, please do not use our services.</p>
        </div>
      </section>

      <!-- Definitions -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">2. Definitions</h2>
        <p class="text-gray-600 leading-relaxed">
          2.1. "Services" refers to all products, features, and functionality provided by {{ state.appName }}, including but not limited to account linking, transaction categorization, and transaction history retrieval.
        </p>
      </section>

      <!-- User Accounts -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">3. User Accounts</h2>
        <div class="space-y-2 text-gray-600 leading-relaxed">
          <p>3.1. You are responsible for maintaining the confidentiality of your account credentials.</p>
          <p>3.2. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
          <p>3.3. {{ state.appName }} reserves the right to terminate accounts found to be in violation of these Terms of Service.</p>
        </div>
      </section>

      <!-- Privacy -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">4. Privacy</h2>
        <p class="text-gray-600 leading-relaxed">
          4.1. {{ state.appName }} values your privacy. Please review our Privacy Policy, which outlines how we collect, use, and share your data.
        </p>
      </section>

      <!-- User Conduct -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">5. User Conduct</h2>
        <div class="space-y-2 text-gray-600 leading-relaxed">
          <p>5.1. You agree not to:</p>
          <ul class="list-disc pl-8 space-y-1">
            <li>Use the services for any illegal or unauthorized purpose.</li>
            <li>Interfere with or disrupt the services or servers.</li>
            <li>Violate any applicable laws, rules, or regulations.</li>
          </ul>
        </div>
      </section>

      <!-- Intellectual Property -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">6. Intellectual Property</h2>
        <div class="space-y-2 text-gray-600 leading-relaxed">
          <p>6.1. All content, trademarks, service marks, logos, and intellectual property displayed on our services are the property of {{ state.appName }} or its licensors.</p>
          <p>6.2. You may not use, reproduce, distribute, or modify any of our intellectual property without prior written consent.</p>
        </div>
      </section>

      <!-- Termination -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">7. Termination</h2>
        <p class="text-gray-600 leading-relaxed">
          7.1. {{ state.appName }} reserves the right to terminate or suspend your access to the services at any time, for any reason, without notice.
        </p>
      </section>

      <!-- Disclaimers -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">8. Disclaimers</h2>
        <p class="text-gray-600 leading-relaxed">
          8.1. {{ state.appName }} provides the services "as is" and makes no warranties or representations regarding their availability, reliability, or accuracy.
        </p>
      </section>

      <!-- Limitation of Liability -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">9. Limitation of Liability</h2>
        <p class="text-gray-600 leading-relaxed">
          9.1. To the extent permitted by law, {{ state.appName }} will not be liable for any direct, indirect, incidental, special, or consequential damages arising from or in connection with the use of our services.
        </p>
      </section>

      <!-- Indemnification -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">10. Indemnification</h2>
        <p class="text-gray-600 leading-relaxed">
          10.1. You agree to indemnify and hold {{ state.appName }}, its affiliates, and its officers, employees, and agents harmless from any claims, liabilities, losses, and expenses.
        </p>
      </section>

      <!-- Governing Law -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">11. Governing Law</h2>
        <p class="text-gray-600 leading-relaxed">
          11.1. These Terms of Service shall be governed by and construed in accordance with the laws of the State of California, United States.
        </p>
      </section>

      <!-- Changes to Terms -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">12. Changes to Terms</h2>
        <p class="text-gray-600 leading-relaxed">
          12.1. {{ state.appName }} reserves the right to update or modify these Terms of Service at any time. Your continued use of the services after such changes will constitute your acceptance of the new terms.
        </p>
      </section>

      <!-- Contact Information -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">Contact Information</h2>
        <p class="text-gray-600 leading-relaxed">
          For questions or concerns about these Terms of Service, please contact {{ state.appName }} at 
          <a :href="`mailto:${state.contact}`" class="text-blue-600 hover:text-blue-700">
            {{ state.contact }}
          </a>.
        </p>
      </section>

      <!-- Entire Agreement -->
      <section class="space-y-4">
        <h2 class="text-2xl font-bold text-gray-900">14. Entire Agreement</h2>
        <p class="text-gray-600 leading-relaxed">
          14.1. These Terms of Service constitute the entire agreement between you and {{ state.appName }} regarding the use of our services.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

const state = reactive({
  contact: '',
  appName: ''
});

async function fetchSiteData() {
  try {
    const { email: contact, name: appName } = await api.get('api/sites');
    state.contact = contact;
    state.appName = appName;
  } catch (error) {
    console.error('Error fetching support email:', error);
  }
}

fetchSiteData();
</script>