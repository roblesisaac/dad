import site from '../controllers/sites';
import { protectedRoute } from '../middlewares/protectedRoute';

export default function(api, baseUrl) {
  const protect = protectedRoute(api, 'sites', baseUrl);
  const admin = protect('admin');

  api.get('/api/sites', site.get);
  
  admin.put('/sites/:_id', site.update);
}