export function userHasAccess(requiredRoles, userRole) {
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
  
    let minRole = allRoles.length;
  
    requiredRoles.forEach(requiredRole => {
      const index = allRoles.indexOf(requiredRole);
      
      if (index !== -1 && index < minRole) {
        minRole = index;
      }
    });
  
    return userRoleIndex >= minRole;
}