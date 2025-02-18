import { encrypt, generateSymmetricKey } from '../utils/encryption.js';
import { params } from '@ampt/sdk';

const { VITE_ZERO_AUDIENCE, ZERO_MGMT_DOMAIN, ZERO_MGMT_CLIENT_ID, ZERO_MGMT_CLIENT_SECRET } = params().list();
const domain = ZERO_MGMT_DOMAIN;

class UserService {
  constructor() {
    this.domain = domain;
    this.audience = VITE_ZERO_AUDIENCE;
  }

  validateManagementToken() {
    const token = ZERO_MGMT_CLIENT_SECRET;
    if (!token) {
      throw new Error('AUTH0_MGMT_TOKEN is not set in environment variables');
    }
    return token;
  }

  async updateUserMetadata(userId, metadata) {
    try {
      const token = this.validateManagementToken();
      console.log('Using domain:', this.domain);
      
      const response = await fetch(`https://${this.domain}/api/v2/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          user_metadata: metadata
        })
      });

      const responseText = await response.text();
      console.log('Auth0 Response:', response.status, responseText);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText };
        }
        throw new Error(`Auth0 API Error: ${error.message || error.error_description || 'Unknown error'} (${response.status})`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Full Auth0 error:', error);
      throw new Error(`Failed to update user metadata: ${error.message}`);
    }
  }

  async ensureUserEncryptionKey(user) {
    if (!user.metadata?.encryptionKey) {
      console.log('Generating new encryption key for user:', user.sub);
      const encryptedKey = encrypt(generateSymmetricKey());
      
      await this.updateUserMetadata(user.sub, {
        ...user.metadata,
        encryptionKey: encryptedKey
      });

      return encryptedKey;
    }

    return user.metadata.encryptionKey;
  }
}

export default new UserService(); 