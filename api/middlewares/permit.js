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

export default (requiredRoles) => (req, res, next) => {
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