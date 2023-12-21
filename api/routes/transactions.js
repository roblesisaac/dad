import app from '../controllers/transactions';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'transactions', baseUrl);
  const member = protect('member');

  member.put('/transactions/:_transactionId', app.updateTransaction);
}