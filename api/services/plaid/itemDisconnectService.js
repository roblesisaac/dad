import plaidItems from '../../models/plaidItems.js';
import itemService from './itemService.js';
import plaidService from './plaidService.js';

class ItemDisconnectService {
  async disconnectItem(itemId, user) {
    if (!itemId || !user?._id) {
      throw new Error('INVALID_PARAMS: Item ID and user are required');
    }

    // The lookup is scoped to the authenticated user.
    const item = await itemService.getItem(itemId, user._id);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND: Bank connection not found');
    }

    if (item.disconnectedAt || item.status === 'disconnected') {
      return {
        disconnected: true,
        alreadyDisconnected: true,
        itemId,
        disconnectedAt: item.disconnectedAt || null
      };
    }

    // Never mark an Item as disconnected unless Plaid confirms removal.
    // This stops future Plaid Item billing without erasing local history.
    try {
      const accessToken = itemService.decryptAccessToken(item, user);
      await plaidService.removeItem(accessToken);
    } catch (error) {
      throw new Error(
        `PLAID_REVOKE_FAILED: Plaid did not confirm disconnection: ${error?.error_message || error?.message || 'Unknown error'}`
      );
    }

    const disconnectedAt = Date.now();

    try {
      // Account, transaction, group, customization and sync-session records are retained.
      // Clear the now-revoked credential to prevent any future Plaid calls for this Item.
      await plaidItems.update(
        { itemId, userId: user._id },
        { status: 'disconnected', disconnectedAt, accessToken: '' }
      );
    } catch (error) {
      // Plaid already revoked the Item; do not claim that local state was saved.
      console.error('Plaid Item removed but local disconnect update failed:', error);
      throw new Error(
        'ITEM_DISCONNECT_SAVE_ERROR: Plaid removed the bank connection, but its local status could not be saved. Please contact support.'
      );
    }

    return { disconnected: true, alreadyDisconnected: false, itemId, disconnectedAt };
  }
}

export default new ItemDisconnectService();
