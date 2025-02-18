import { encrypt, generateSymmetricKey } from '../utils/encryption.js';
import { params } from '@ampt/sdk';

const { VITE_ZERO_AUDIENCE, ZERO_MGMT_DOMAIN, ZERO_MGMT_CLIENT_ID, ZERO_MGMT_CLIENT_SECRET } = params().list();
const domain = ZERO_MGMT_DOMAIN;

class UserService {
  constructor() {
    this.domain = domain;
    this.audience = VITE_ZERO_AUDIENCE;
    this.managementToken = null;
    this.tokenExpiresAt = null;
  }

  async getManagementToken() {
    // Check if we have a valid cached token
    if (this.managementToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.managementToken;
    }

    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: ZERO_MGMT_CLIENT_ID,
          client_secret: ZERO_MGMT_CLIENT_SECRET,
          audience: `https://${this.domain}/api/v2/`,
          grant_type: 'client_credentials'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Failed to get management token: ${data.error_description || data.error}`);
      }

      this.managementToken = data.access_token;
      // Set expiration 5 minutes before actual expiration to be safe
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000);
      
      return this.managementToken;
    } catch (error) {
      console.error('Error getting management token:', error);
      throw new Error(`Failed to get management token: ${error.message}`);
    }
  }

  async updateUserMetadata(userId, metadata) {
    try {
      const token = await this.getManagementToken();
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