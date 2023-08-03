import Protect from '../middlewares/protect';
import Users from '../models/users';
import page from '../controllers/pages';

const app = function() {
  function buildFilter(req) {
    return { email: req.params.id || rapp.email }
  }

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

  function hasAccess(req) {
    return req.params.id && Protect.userHasAccess('admin', req.user.role);
  }

  return {
    updateUser: async (req, res) => {    
      if(!hasAccess(req)) {
        handleError(res, 'You do not have permission to access this resource.');
      }
    
      const filter = buildFilter(req);
      const updated = await Users.update(filter, req.body);
      
      res.json(updated);
    },
    getUserPages: async(user) => {
      if(hasSpecificUserViews(user)) {
        return {
          name: user.email,
          views: user.views
        }
      }

      const userRole = getUserRole(user);
    
      return await page.getDefaultPages(userRole);
    },
    serveAllRoleNames: (_, res) => {
      res.json([...Protect.allRoles]);
    },
    serveUserPages: async (req, res) => {
      res.json(await app.getUserPages(req.user));
    }
  }
}();

export default app;