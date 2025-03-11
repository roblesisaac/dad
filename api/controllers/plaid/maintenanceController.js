import transactionQueryService from '../../services/plaid/transactionQueryService.js';
import transactionManagementService from '../../services/plaid/transactionManagementService.js';

export default {
  async getDuplicates(req, res) {
    try {
      const duplicates = await transactionQueryService.findDuplicates(req.user._id);
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
      const removed = await transactionManagementService.removeFromDb(req.body);
      res.json(removed);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 