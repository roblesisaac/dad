import app from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  member.post('/plaid/connect', app.connectLink);
  member.post('/plaid/exchange', app.exchangeTokenAndSavePlaidItem);
  member.get('/plaid/accounts/:_id?', app.getAccounts);
  member.get('/plaid/items/:_id?', app.getPlaidItems);
  member.get('/plaid/sync/accounts', app.syncAccounts);
  member.get('/plaid/sync/transactions/:itemId', app.initSyncTransactions);
  member.get('/plaid/transactions/:_id?', app.getTransactions);
  member.get('/plaid/sync/all/user/data', app.syncAllUserData);
  member.get('/plaid/get/duplicates', app.getDuplicates);
  member.post('/plaid/remove/duplicates', app.removeDuplicates);
}