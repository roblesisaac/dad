import { loadPages } from '../controllers/pages';

export default (api, baseUrl) => {
  api.get(baseUrl+'/pages', loadPages);
}