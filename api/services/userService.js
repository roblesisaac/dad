import { encrypt, generateSymmetricKey } from '../utils/encryption.js';
import { params } from '@ampt/sdk';

const { VITE_ZERO_DOMAIN, VITE_ZERO_AUDIENCE } = params().list();
const domain = VITE_ZERO_DOMAIN;

class UserService {
  constructor() {
    this.domain = domain;
    this.audience = VITE_ZERO_AUDIENCE;
  }

  async updateUserMetadata(userId, metadata) {
    const response = await fetch(`https://${this.domain}/api/v2/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AUTH0_MGMT_TOKEN}`
      },
      body: JSON.stringify({
        user_metadata: metadata
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update user metadata');
    }

    return await response.json();
  }

  async ensureUserEncryptionKey(user) {
    if (!user.metadata?.encryptionKey) {
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