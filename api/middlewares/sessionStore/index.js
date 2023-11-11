import { params } from '@ampt/sdk';
import CustomSessionStore from './customStore.js';
import session from 'express-session';
const {
  SESSION_ID,
  AMPT_URL,
  ENV_NAME
} = params().list();

const hostName = AMPT_URL.replace('https://', '');
const domain = ENV_NAME === 'prod' ? '.tracktabs.com' : '.'+hostName;

export default function customSessions() {
  return session({
    genid: req => req.sessionID,
    secret: SESSION_ID,
    resave: false,
    saveUninitialized: false,
    store: new CustomSessionStore(),
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      domain,
      maxAge: (15) * 1000,
      signed: true
    }
  });
}