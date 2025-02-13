import site from '../controllers/sites';
import Protect from '../middlewares/protect';

export default function(api, baseUrl) {
  const protect = Protect.route(api, 'sites', baseUrl);
  const admin = protect('admin');

  api.get('sites', site.get);
  
  admin.put('/sites/:_id', site.update);
}