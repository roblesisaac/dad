const protect = function() {
  const state = {
    allRoles: [
      'public',
      'guest',
      'member',
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'moderator',
      'admin',
      'owner'
    ]
  }

  function buildHandler(api, collectionName, baseUrl, requiredRoles, httpMethod) {
    return (url, ...middlewares) => {
      const handler = middlewares[middlewares.length-1];
      const routeMiddlewares = [
        permit(requiredRoles),
        defineParam(collectionName),
        ...middlewares
      ];
  
      return api[httpMethod](baseUrl + url, ...routeMiddlewares, handler);
    };
  }

  function defineParam(collectionName) {
    return (req, _, next) => {
      req.params.collection = collectionName;
      next();
    };
  }

  function permit(requiredRoles) {
    return (req, res, next) => {
      const { role:userRole } = req.user || {};
    
      if(protect.userHasAccess(requiredRoles, userRole)) {
        return next()
      }
    
      res.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to access this resource.',
        requiredRoles,
        userRole
      });
    }
  }

  return {
    allRoles: state.allRoles,
    route: function(api, collectionName, baseUrl = '/') {
      return (requiredRoles) => {

        function handle(httpMethod) {
          return buildHandler(api, collectionName, baseUrl, requiredRoles, httpMethod);
        }
      
        return {
          get: handle('get'),
          put: handle('put'),
          post: handle('post'),
          delete: handle('delete')
        }
      };
    },
    userHasAccess: function(requiredRoles, userRole) {
      if(Array.isArray(requiredRoles)) {
        return requiredRoles.includes(userRole);
      };
    
      let userRoleIndex = state.allRoles.indexOf(userRole);
    
      if (userRoleIndex === -1) {
        return false;
      }
    
      let minRole = state.allRoles.indexOf(requiredRoles);
    
      return userRoleIndex >= minRole;
    }
  }
}();

export default protect;