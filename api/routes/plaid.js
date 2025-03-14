import linkController from '../controllers/plaid/linkController.js';
import itemController from '../controllers/plaid/itemController.js';
import transactionController from '../controllers/plaid/transactionController.js';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  // Link and Authentication
  member.post('/plaid/connect/link/:itemId?', linkController.createLink);
  member.post('/plaid/exchange/token', linkController.exchangeTokenAndSavePlaidItem);

  // Items and Accounts
  member.get('/plaid/items/:_id?', itemController.getUserItems);
  member.get('/plaid/sync/items', itemController.syncItems);
  member.get('/plaid/sync/accounts/and/groups', itemController.syncAccountsAndGroups);

  // Transactions
  member.get('/plaid/transactions/:_id?', transactionController.getTransactions);
  member.get('/plaid/sync/latest/transactions/:itemId', transactionController.syncLatestTransactionsForItem);
  
  // Maintenance
}