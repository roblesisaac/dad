import PlaidBaseService from './baseService.js';
import plaidTransactions from '../../models/plaidTransactions.js';

/**
 * Service responsible for transaction management operations
 * Handles transaction removal, validation, and other basic operations
 */
class TransactionManagementService extends PlaidBaseService {
  /**
   * Removes transactions from the database
   * @param {Array} transactionIds - Array of transaction IDs to remove
   * @returns {Number} Number of transactions removed
   */
  async removeFromDb(transactionIds) {
    if (!transactionIds || !transactionIds.length) {
      return 0;
    }
    
    let removedCount = 0;
    
    // Remove transactions one by one
    for (const id of transactionIds) {
      try {
        const result = await plaidTransactions.erase({ transaction_id: id });
        if (result && result.removed) {
          removedCount++;
        }
      } catch (error) {
        console.error(`Failed to remove transaction ${id}:`, error.message);
      }
    }
    
    return removedCount;
  }
}

export default new TransactionManagementService(); 