import app from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  member.get('/link/token', app.getLinkToken);
  member.get('/plaid/items/:_id?', app.getPlaidItems);
  member.get('/plaid/accounts/:_id?', app.getAccounts);
  member.get('/plaid/sync/accounts', app.syncAccounts);
  member.get('/plaid/sync/:_id', app.initSyncTransactions);
  member.get('/plaid/transactions/:_id?', app.getTransactions);
  member.post('/plaid/exchange', app.exchangeToken);
}