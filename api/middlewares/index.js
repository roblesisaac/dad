import { v4 } from 'uuid';
import xss from 'xss-clean';

import SessionStore from './sessionStore';
import { passport } from './passport';

function uuidv4(req, _, next) {
  if (!req.sessionID) {
    req.sessionID = v4();
  }
  
  next();
}

export {
  passport,
  SessionStore,
  uuidv4,
  xss
};