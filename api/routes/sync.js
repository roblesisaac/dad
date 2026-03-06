import app from '../controllers/sync';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'sync', baseUrl);
  const member = protect('member');

  member.get('/sync/state', app.getSyncState);
}
