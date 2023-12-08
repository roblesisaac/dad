import app from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  member.post('/plaid/connect/link', app.connectLink);
  member.get('/plaid/connect/link/update/:itemId', app.connectLinkUpdate);
  member.post('/plaid/exchange/token', app.exchangeTokenAndSavePlaidItem);
  member.get('/plaid/get/duplicates', app.getDuplicates);
  member.get('/plaid/get/transaction/count', app.getAllTransactionCount);
  member.get('/plaid/items/:_id?', app.getPlaidItems);
  member.get('/plaid/sync/items', app.retreivePlaidItems);
  member.get('/plaid/remove/all/transactions', app.removeAllTransactionsFromDatabase);
  member.post('/plaid/remove/duplicates', app.removeFromDb);
  member.get('/plaid/sync/accounts/and/groups', app.syncAccountsAndGroups);
  member.get('/plaid/sync/all/transactions', app.syncAllUserTransactions);
  member.get('/plaid/transactions/:_id?', app.getTransactions);
}