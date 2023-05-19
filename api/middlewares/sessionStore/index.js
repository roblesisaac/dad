import { params } from '@ampt/sdk';
import CustomSessionStore from './customStore.js';
import session from 'express-session';
const {
  SESSION_ID,
  AMPT_URL
} = params().list();

const hostName = AMPT_URL.replace('https://', '');
const domain = '.'+hostName;

const store = new (CustomSessionStore(session))();

export default function customSessions() {
  return session({
    genid: req => req.sessionID,
    secret: SESSION_ID,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      domain,
      maxAge: (60*60) * 1000,
      signed: true
    }
  });
}