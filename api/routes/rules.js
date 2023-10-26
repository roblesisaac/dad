import app from '../controllers/rules';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'rules', baseUrl);
  const member = protect('member');

  member.get('/rules/:_id?', app.getRules);
  member.post('/rules', app.saveRule);
  member.put('/rules/:_ruleId', app.updateRule);
}