import plaidController from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  // Link and Authentication
  member.post('/plaid/connect/link/:itemId?', plaidController.connectLink);
  member.post('/plaid/exchange/token', plaidController.exchangeTokenAndSavePlaidItem);

  // Items and Accounts
  member.get('/plaid/items/:_id?', plaidController.getPlaidItems);
  member.get('/plaid/sync/items', plaidController.retreivePlaidItems);
  member.get('/plaid/sync/accounts/and/groups', plaidController.syncAccountsAndGroups);

  // Transactions
  member.get('/plaid/transactions/:_id?', plaidController.getTransactions);
  member.get('/plaid/get/transaction/count', plaidController.getAllTransactionCount);
  member.get('/plaid/sync/all/transactions', plaidController.syncAllUserTransactions);
  
  // Maintenance
  member.get('/plaid/get/duplicates', plaidController.getDuplicates);
  member.post('/plaid/remove/duplicates', plaidController.removeFromDb);
  member.get('/plaid/remove/all/transactions', plaidController.removeAllTransactionsFromDatabase);

  // Onboarding
  member.post('/plaid/onboarding/sync/:itemId', plaidController.startOnboardingSync);
  member.get('/plaid/onboarding/status/:itemId', plaidController.getOnboardingStatus);
}