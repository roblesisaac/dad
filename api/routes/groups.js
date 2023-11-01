import app from '../controllers/groups';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'groups', baseUrl);
  const member = protect('member');

  member.get('/groups/:_groupId?', app.getGroups);
  member.post('/groups', app.saveGroup);
  member.put('/groups/:_groupId', app.updateGroup);
  member.delete('/groups/:_groupId', app.deleteGroup);
}