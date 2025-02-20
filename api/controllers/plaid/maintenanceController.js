import { transactionService } from '../../services/plaid';
import tasks from '../../tasks/plaidTask';

export default {
  async getDuplicates(req, res) {
    try {
      const duplicates = await transactionService.findDuplicates(req.user._id);
      res.json(duplicates);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async removeDuplicates(req, res) {
    try {
      const removed = await transactionService.removeFromDb(req.body);
      res.json(removed);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async removeAllTransactions(req, res) {
    try {
      if (req.query.confirm !== 'remove all transactions') {
        return res.json(`You must type "remove all transactions" to confirm.`);
      }

      await tasks.removeAllUserTransactions(req.user);
      res.json(`Removing all your transactions. You will be notified at ${req.user.email} when the process is complete.`);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 