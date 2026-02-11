import itemService from '../../services/plaid/itemService.js';
import linkService from '../../services/plaid/linkService.js';

export default {
  async createLink(req, res) {
    try {
      const { itemId } = req.params;
      const link_token = await linkService.createLinkToken(req.user, itemId);
      res.json({ link_token });
    } catch (error) {
      res.status(400).json({
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1]
      });
    }
  },

  async exchangeTokenAndSavePlaidItem(req, res) {
    try {
      const { publicToken } = req.body;

      // 1. Exchange public token for access token
      const accessData = await linkService.exchangePublicToken(publicToken);

      // 2. Save or update the Plaid item
      const plaidItem = await itemService.savePlaidAccessData(accessData, req.user);

      // 3. Migrate transactions from old items to this new item and clean up
      // This handles the case where a user is reconnecting after credentials expired
      let migrationResult = null;
      try {
        migrationResult = await itemService.migrateAndCleanupOldItems(
          plaidItem.itemId,
          req.user._id
        );
        if (migrationResult.migrated > 0) {
          console.log(`Migration completed: ${migrationResult.message}`);
        }
      } catch (migrationError) {
        // Log but don't fail the request - the item was still connected successfully
        console.error('Migration warning:', migrationError.message);
      }

      res.json({
        status: 'success',
        data: {
          itemId: plaidItem.itemId,
          status: 'pending',
          message: 'Item connected successfully',
          migration: migrationResult
        }
      });
    } catch (error) {
      console.error('Exchange token error:', error);
      res.status(400).json({
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1]
      });
    }
  }
}; 