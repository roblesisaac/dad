function defineParam(collectionName) {
  return (req, _, next) => {
    req.params.collection = collectionName;
    next();
  };
}

export function userHasAccess(requiredRoles, userRole) {
  if(Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  };

  const allRoles = [
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
  ];

  let userRoleIndex = allRoles.indexOf(userRole);

  if (userRoleIndex === -1) {
    return false;
  }

  let minRole = allRoles.indexOf(requiredRoles);

  return userRoleIndex >= minRole;
}

function permit(requiredRoles) {
  return (req, res, next) => {
    const { role:userRole } = req.user || {};
  
    if(userHasAccess(requiredRoles, userRole)) {
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

export function protectedRoute(api, collectionName, baseUrl = '/') {
  return (requiredRoles) => {
    
    function handle(httpMethod) {
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
  
    return {
      get: handle('get'),
      put: handle('put'),
      post: handle('post'),
      delete: handle('delete')
    }
  };
}