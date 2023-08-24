'use strict';

import { data } from '@ampt/data';

export default function (connect) {
  const Store = connect.Store || connect.sessionStore;

  return class CustomStore extends Store {
    storeInstance = null;

    constructor() {
      super();
      this.storeInstance = new Store();
    }

    async get(sessionId, callback) {
      try {
        const sessionData = await data.get(`sessions:${sessionId}`);

        if (!sessionData) {
          return callback(null, null);
        }

        const session = JSON.parse(sessionData);
        const cookie = session ? session.cookie : null;

        if (cookie && cookie.expires) {
          cookie.expires = new Date(cookie.expires);
        }

        if (cookie.expires < new Date()) {
          await this.destroy(sessionId);
          return callback(null, null);
        }

        return callback(null, session);
      } catch (error) {
        callback(error);
      }
    }

    async set(sessionId, session, callback) {
      try {
        const id = `sessions:${sessionId}`;
        const payload = JSON.stringify(session);
        const maxAge = session.cookie.originalMaxAge || 0;
        const ttl = Math.round(maxAge / 1000);

        const result = await data.set(id, payload, { ttl });
        callback(null, result);
      } catch (error) {
        callback(error);
      }
    }

    async destroy(sessionId, callback) {
      try {
        const result = await data.remove(`sessions:${sessionId}`);

        if (typeof callback === 'function') {
          callback(null, result);
        }
      } catch (error) {
        console.log(error);
        if (typeof callback === 'function') {
          callback(error);
        }
      }
    }
  };
}
