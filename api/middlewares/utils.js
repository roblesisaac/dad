import { data } from '@ampt/data';

export function concatUseridToReq(req, _, next) {
  for (const key in req.query) {
    if(key === 'select') {
      continue;
    }
    req.query[key] = req.user._id + req.query[key];
  }
  next();
}

export async function ensureUserCreatedItem(req, res, next) {
  const { _id, role } = req.user;
  const { key } = req.params;
  
  if(role === 'admin') {
    return next();
  }
  
  const { userid } = await data.get(key);
  
  if(userid === _id) {
    return next();
  }
  
  res.status(400).json(`Editing other users documents is prohibited.`);
}