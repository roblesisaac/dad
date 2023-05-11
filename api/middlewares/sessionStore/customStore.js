'use strict';

import { data } from '@ampt/data';

export default function(connect) {
    const Store = connect.Store || connect.sessionStore;
  
    return class CustomStore extends Store {
        constructor() {
            super()
        }
  
        async get(sid, callback) {
            const session = await data.get(`sessions:${sid}`);
        
            if (!session) {
              return callback(null, null);
            }
        
            const sess = JSON.parse(session),
                cookie = sess ? sess.cookie : null;
        
            if (cookie && cookie.expires) {
                cookie.expires = new Date(cookie.expires);
            }
            
            if (cookie.expires < new Date()) {
                await this.destroy(sid);
                return callback(null, null);
            }
        
            return callback(null, sess);
        }
  
        async set(sid, session, callback) {
            console.log({ sid });
            try {
                const id = `sessions:${sid}`;
                const payload = JSON.stringify(session);
                const maxAge = session.cookie.originalMaxAge || 0;
                const ttl = Math.round(maxAge / 1000);
  
                const result = await data.set(id, payload, { ttl });
                callback(null, result);
            } catch (err) {
                callback(err);
            }
        }
  
        async destroy(sid, callback) {
            try {
                const result = await data.remove(`sessions:${sid}`);
  
                if (typeof callback == 'function') callback(null, result);
            } catch (err) {
                console.log(err);
                if(typeof callback == 'function') next(err);
            }
        }
  
    }
};