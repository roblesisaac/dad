import { permit } from '../middlewares';

const defineParam = (paramName) => (req, res, next) => {
    req.params.collection = paramName;
    next();
  };
  
export default (
    api,
    collectionName,
    baseUrl='/'
  ) => {
    const handle = (
        httpMethod
    ) => (
        url, 
        handler, 
        permits
    ) => api[httpMethod](
        baseUrl+url, 
        permit(permits), 
        defineParam(collectionName), 
        handler
    );
    
    return {
        get: handle('get'),
        put: handle('put'),
        post: handle('post'),
        delete: handle('delete')
    }
  }