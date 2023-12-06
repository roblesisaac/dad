'use strict';

import { data } from '@ampt/data';
import expressSession from 'express-session';

export default class CustomStore extends expressSession.Store {
  constructor() {
    super();
  }  

  async get(sessionId, callback) {
    try {
      const sessionData = await data.get(`sessions:${sessionId}`);
      if(!sessionData) {
        console.log('no session data for ', sessionId);
        return callback(null, null);
      }
      callback(null, JSON.parse(sessionData));
    } catch (error) {
      callback(error);
    }
  }

  async set(sessionId, session, callback) {
    try {
      session.cookie.expires = new Date(session.cookie.expires);
      session.cookie.originalMaxAge = session.cookie.maxAge;
      const payload = JSON.stringify(session);
      const ttl = Math.round((session.cookie.expires - Date.now()) / 1000);
  
      const result = await data.set(`sessions:${sessionId}`, payload, { ttl });
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }

  async touch(sessionId, session, callback) {
    try {
      session.lastAccess = new Date().getTime();
  
      this.set(sessionId, session, callback);
    } catch (error) {
      callback(error);
    }    
  
  }

  async destroy(sessionId, callback) {
    try {
      await data.remove(`sessions:${sessionId}`);
      callback(null, true);
    } catch (error) {
      callback(error);
    }
  }
}