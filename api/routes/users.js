import { protectedRoute } from '../middlewares/protectedRoute';
import data from '../controllers/data';
import { concatToQuery } from '../middlewares/users';

import {
  getUserPages,
  updateUser
} from '../controllers/users';

export default (api, baseUrl) => {
  const protect = protectedRoute(api, 'users', baseUrl);
  const member = protect('member');
  const admin = protect('admin');

  api.get(baseUrl + '/userviews', getUserPages);

  member.get('/users', concatToQuery('email'), data.get);
  member.put('/users/:id', updateUser);

  admin.get('/allusers', data.get);
}