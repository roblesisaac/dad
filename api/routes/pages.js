import pages from '../controllers/pages';

export default (api, baseUrl) => {
  api.get(baseUrl+'/pages', pages.servePages);
}