import { permit } from '../middlewares';

const defineParam = (paramName) => (req, res, next) => {
  req.params.collection = paramName;
  next();
};

const createRoute = (api, collectionName, baseUrl = '/') => {
  const handle = (httpMethod) => (url, requiredRoles, ...middlewares) => {
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
  };
};

export default createRoute;