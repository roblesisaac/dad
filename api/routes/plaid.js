import plaidController from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  // Link and Authentication
  member.post('/plaid/connect/link/:itemId?', plaidController.connectLink);
  member.post('/plaid/exchange/token', plaidController.exchangeTokenAndSavePlaidItem);

  // Items and Accounts
  member.get('/plaid/items/:_id?', plaidController.getUserItems);
  member.get('/plaid/sync/items', plaidController.retreivePlaidItems);
  member.get('/plaid/sync/accounts/and/groups', plaidController.syncAccountsAndGroups);

  // Transactions
  member.get('/plaid/transactions/:_id?', plaidController.getTransactions);
  member.get('/plaid/sync/latest/transactions', plaidController.syncLatestTransactions);
  
  // Maintenance
  member.get('/plaid/get/duplicates', plaidController.getDuplicates);
  member.post('/plaid/remove/duplicates', plaidController.removeFromDb);

  // Onboarding
  member.post('/plaid/onboarding/sync/:itemId', plaidController.startOnboardingSync);
  member.get('/plaid/onboarding/status/:itemId', plaidController.getOnboardingStatus);
}