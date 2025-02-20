import { transactionService } from '../../services/plaid';

export default {
  async getTransactions(req, res) {
    try {
      const { _id } = req.params;
      const { user, query } = req;

      if (_id) {
        const transaction = await transactionService.fetchTransactionById(_id, user._id);
        return res.json(transaction);
      }

      const userQueryForDate = transactionService.buildUserQueryForTransactions(user._id, query);
      const transactions = await transactionService.fetchTransactions(userQueryForDate);
      res.json(transactions);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async getTransactionCount(req, res) {
    try {
      const count = await transactionService.getAllTransactionCount(req.user._id);
      res.json(count);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async syncTransactions(req, res) {
    try {
      const { itemId } = req.params;
      const response = await transactionService.syncTransactionsForItem(itemId, req.user);
      res.json(response);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async syncAllUserTransactions(req, res) {
    try {
      const response = await transactionService.syncAllUserTransactions(req.user);
      res.json(response);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 