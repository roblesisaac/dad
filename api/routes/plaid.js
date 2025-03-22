import linkController from '../controllers/plaid/linkController.js';
import itemController from '../controllers/plaid/itemController.js';
import transactionController from '../controllers/plaid/transactionController.js';
import Protect from '../middlewares/protect';
import syncSessionController from '../controllers/plaid/syncSessionController.js';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  // Link and Authentication
  member.post('/plaid/connect/link/:itemId?', linkController.createLink);
  member.post('/plaid/exchange/token', linkController.exchangeTokenAndSavePlaidItem);

  // Items and Accounts
  member.get('/plaid/items/:_id?', itemController.getUserItems);
  member.put('/plaid/items/:_id', itemController.updateItem);
  member.get('/plaid/sync/items', itemController.syncItems);
  member.get('/plaid/sync/accounts/and/groups', itemController.syncAccountsAndGroups);

  // Transactions
  member.get('/plaid/transactions/:_id?', transactionController.getTransactions);
  member.get('/plaid/sync/latest/transactions/:itemId', transactionController.syncLatestTransactionsForItem);
  
  // Sync Sessions
  member.get('/plaid/items/:itemId/sync-sessions', syncSessionController.getSyncSessionsForItem);
  member.post('/plaid/items/:itemId/revert/:sessionId', syncSessionController.revertToSyncSession);
  
  // Maintenance
}