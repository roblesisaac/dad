import { userHasAccess } from '../middlewares/protectedRoute';
import Users from '../models/users';
import page from '../controllers/pages';

export async function updateUser(req, res) {
  const { 
    body, 
    params: { id: altEmail }, 
    user: { email, role } 
  } = req;

  if(altEmail && !userHasAccess('admin', role)) {
    const errMessage = 'You do not have permission to access this resource.'

    res.status(403).json({
      error: 'Access Denied',
      message: errMessage,
      requiredRoles,
      userRole
    });

    throw Error(errMessage);
  }

  const filter = { email: altEmail || email };
  const updated = await Users.update(filter, body);
  
  res.json(updated);
}

export async function getUserPages(req, res) {
  const { user } = req;

  if(!user) {
    return res.json(await page.getDefaultPages());
  }

  const pages = !user.views.length && !user.hideAllViews
    ? await page.getDefaultPages(user.role)
    : { name: user.email, views: user.views};

  res.json(pages);
}