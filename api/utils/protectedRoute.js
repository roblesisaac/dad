import { permit } from '../middlewares';

const defineParam = (collectionName) => (req, res, next) => {
  req.params.collection = collectionName;
  next();
};

const createRoute = (api, collectionName, baseUrl = '/') => (requiredRoles) => {
  const handle = (httpMethod) => (url, ...middlewares) => {
    const handler = middlewares[middlewares.length-1];
    const routeMiddlewares = [
      permit(requiredRoles),
      defineParam(collectionName),
      ...middlewares
    ];

    return api[httpMethod](baseUrl + url, ...routeMiddlewares, handler);
  };

  return {
    get: handle('get'),
    put: handle('put'),
    post: handle('post'),
    delete: handle('delete')
  }
};

export default createRoute;