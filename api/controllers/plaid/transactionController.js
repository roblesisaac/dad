import { transactionService, itemService } from '../../services/plaid/index.js';

export default {
  /**
   * Get transactions for user
   */
  async getTransactions(req, res) {
    try {
      const user = req.user;
      const { _id } = req.params;
      
      // Handle case with transaction ID
      if (_id) {
        const transaction = await transactionService.fetchTransactionById(_id, user._id);
        return res.json(transaction);
      }
      
      const transactions = await transactionService.fetchTransactions(req.user, req.query);
      
      return res.json(transactions);
    } catch (error) {
      let errorCode = 'TRANSACTION_ERROR';
      let errorMessage = error.message;
      
      if (error.code) {
        errorCode = error.code;
        errorMessage = error.originalMessage || error.message;
      } else if (error.message && error.message.includes(':')) {
        [errorCode, errorMessage] = error.message.split(': ');
      }
      
      return res.status(400).json({
        error: errorCode,
        message: errorMessage
      });
    }
  },

  /**
   * Sync transactions for a specific item
   */
  async syncLatestTransactionsForItem(req, res) {
    try {
      const user = req.user;
      const { itemId } = req.params;

      const item = await itemService.getUserItems(user._id, itemId);

      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }

      const batchResult = await transactionService.processSingleBatch(item, user);

      return res.json(batchResult);
    } catch (error) {
      return res.status(400).json({
        error: 'TRANSACTION_ERROR',
        message: error.message
      });
    }
  }
}; 