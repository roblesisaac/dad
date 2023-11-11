import app from '../controllers/tabs';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'tabs', baseUrl);
  const member = protect('member');

  member.get('/tabs/:_id?', app.getTabs);
  member.post('/tabs', app.saveTab);
  member.put('/tabs/:_tabId', app.updateTab);
  member.delete('/tabs/:_tabId', app.deleteTab);
}