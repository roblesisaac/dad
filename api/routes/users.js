import Protect from '../middlewares/protect';
import db from '../controllers/db';
import { concatToQuery } from '../middlewares/users';

import user from '../controllers/users';

export default (api, baseUrl) => {
  const protect = Protect.route(api, 'users', baseUrl);
  const member = protect('member');
  const admin = protect('admin');

  api.get(baseUrl + '/userviews', user.serveUserPages);

  member.get('/users', concatToQuery('email'), db.get);
  member.get('/allroles', user.serveAllRoleNames);
  member.put('/users/:id', user.updateUser);

  admin.get('/allusers', db.get);
}