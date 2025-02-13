<template>
	<div class="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
		<div class="space-y-12">
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Encryption in Transit</h2>
				<p class="text-gray-600 leading-relaxed">
					All data transmitted between your device and our servers is encrypted using industry-standard Secure Socket Layer (SSL) and Transport Layer Security (TLS) protocols. This encryption ensures that your data remains confidential during transmission, reducing the risk of interception by unauthorized parties.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Encryption at Rest</h2>
				<p class="text-gray-600 leading-relaxed">
					Your sensitive data, once stored in our database, is also protected through encryption. We use advanced encryption methods to secure your information while it is stored on our servers. This means that even if someone gains unauthorized access to our database, they will not be able to decipher your data without the necessary encryption keys.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Access Control</h2>
				<p class="text-gray-600 leading-relaxed">
					Access to your data is strictly controlled and limited to authorized personnel who require it for legitimate purposes. We have implemented role-based access control mechanisms to ensure that only the individuals with the appropriate permissions can access and manipulate your data.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Regular Audits and Monitoring</h2>
				<p class="text-gray-600 leading-relaxed">
					We conduct regular security audits and monitoring of our systems to identify and address any vulnerabilities or threats. This proactive approach helps us stay ahead of potential security risks.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Data Retention</h2>
				<p class="text-gray-600 leading-relaxed">
					We only retain your data for as long as it is necessary for the purposes for which it was collected. Once your data is no longer needed, it is securely deleted from our systems to minimize any potential exposure.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">User Authentication</h2>
				<p class="text-gray-600 leading-relaxed">
					We require strong user authentication to ensure that only authorized users can access your account and data. This includes password policies and, where applicable, two-factor authentication (2FA) to enhance account security.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Third-Party Services</h2>
				<p class="text-gray-600 leading-relaxed">
					In some cases, we may use third-party services to enhance our functionality. These services are carefully vetted for their security practices and comply with relevant data protection regulations.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Your Responsibilities</h2>
				<p class="text-gray-600 leading-relaxed">
					While we take every precaution to protect your data, it's important for you, as a user, to play your part in ensuring data security. This includes using strong, unique passwords and keeping your login credentials confidential. Additionally, please be cautious about sharing sensitive information or clicking on suspicious links or emails.
				</p>
			</section>
			
			<section class="space-y-4">
				<h2 class="text-2xl font-bold text-gray-900">Questions or Concerns</h2>
				<p class="text-gray-600 leading-relaxed">
					If you have any questions or concerns about how we handle your data or if you suspect any security issues, please contact our support team at 
					<a :href="`mailto:${supportEmail}`" class="text-blue-600 hover:text-blue-700">
						{{ supportEmail }}
					</a>.
				</p>
			</section>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();
const supportEmail = ref('');

async function fetchSupportEmail() {
	try {
		const { email } = await api.get('api/sites');
		supportEmail.value = email;
	} catch (error) {
		console.error('Error fetching support email:', error);
	}
}

fetchSupportEmail();
</script>