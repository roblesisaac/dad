import app from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaiditems', baseUrl);
  const member = protect('member');

  member.get('/link/token', app.getLinkToken);
  member.get('/plaid/items', app.getPlaidItemsByItemId);
  member.get('/plaid/items/:_id?', app.getPlaidItemsBy_id);
  member.get('/plaid/accounts/:_id', app.getAccounts);
  member.get('/plaid/sync/:_id', app.initSyncEvent);
  member.post('/plaid/exchange', app.exchangeToken);
}