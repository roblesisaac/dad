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