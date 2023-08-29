import Protect from '../middlewares/protect';
import Users from '../models/users';
import page from '../controllers/pages';
import { scrub } from '../../src/utils';

const app = function() {
  function getUserRole(user) {
    return user?.role || 'public';
  }

  function handleError(res, errMessage) {
    res.status(403).json({
      error: 'Access Denied',
      message: errMessage,
      userRole: req.user.role
    });

    throw Error(errMessage);
  }

  function hasSpecificUserViews(user) {
    return user?.views?.length || user?.hideAllViews;
  }

  function hasAccess({ params, user }) {
    const updatingAnotherUser = params._id !== user._id;

    return updatingAnotherUser && Protect.userHasAccess('admin', user.role);
  }

  return {
    fetchUser: async ({ user }, res) => {
      const fetchedUser = await Users.findOne(user._id);
      delete fetchedUser.encryptionKey;

      res.json(fetchedUser);
    },
    getUserPages: async(user) => {
      if(hasSpecificUserViews(user)) {
        return {
          name: user.email,
          views: user.views.concat('logout')
        }
      }

      const userRole = getUserRole(user);
    
      return await page.getDefaultPages(userRole);
    },
    lookupUsers: async ({ query, params }, res) => {
      const { email } = query;
      const { _id } = params;

      const response = email ? 
        await Users.findUser(email)
        : _id ?
        await Users.findOne(_id)
        : await Users.find({ email: '*' });

      res.json(scrub(response, ['encryptionKey', 'email']));
    },
    serveAllRoleNames: (_, res) => {
      res.json([...Protect.allRoles]);
    },
    serveUserPages: async (req, res) => {
      res.json(await app.getUserPages(req.user));
    },
    updateUser: async (req, res) => {    
      if(!hasAccess(req)) {
        handleError(res, 'You do not have permission to access this resource.');
      }
    
      const updated = await Users.update(req.params._id, req.body);
      
      res.json(updated);
    }
  }
}();

export default app;