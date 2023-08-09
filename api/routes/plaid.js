import app from '../controllers/plaid';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'plaid', baseUrl);
  const member = protect('member');

  member.get('/linktoken', app.getLinkToken);
}