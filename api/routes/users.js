import Protect from '../middlewares/protect';
import db from '../controllers/db';

import user from '../controllers/users';

export default (api, baseUrl) => {
  const protect = Protect.route(api, 'users', baseUrl);
  const member = protect('member');
  const admin = protect('admin');

  api.get(baseUrl + '/userviews', user.serveUserPages);

  member.get('/users', user.fetchUser);
  member.get('/allroles', user.serveAllRoleNames);
  member.put('/users/:id', user.updateUser);

  admin.get('/allusers', db.get);
}