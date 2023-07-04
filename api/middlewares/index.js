import { params } from '@ampt/sdk';
import { data } from '@ampt/data';
import rateLimit from 'express-rate-limit';
import { v4 } from 'uuid';
import fetch from 'node-fetch';
import xss from 'xss-clean';

import SessionStore from './sessionStore';
import { passport } from './passport';
import permit from './permit';

const { RECAPTCHA_KEY } = params().list();

export const rateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

export async function recaptcha(req, res, next) {
  const { recaptchaToken } = req.body;
  const params = `secret=${RECAPTCHA_KEY}&response=${recaptchaToken}`;
  const url = 'https://www.google.com/recaptcha/api/siteverify?'+params;
  
  const response = await fetch(url, { method: 'POST' });
  const { score, success } = await response.json();
  
  if(score >= 0.5 || success === true) {
    return next()
  }
  
  const errorMessage = `Unexpected error: reCaptcha failure: score is '${score}' and success is '${success}'`;
  
  console.error({
    errorMessage,
    response
  });
  res.status(404).json(errorMessage);
}

export function uuidv4(req, res, next) {
  if (!req.sessionID) {
    req.sessionID = v4();
  }
  
  next();
}

export function checkLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  
  res.writeHead(302, { Location: '/login' });
  res.end();
}

export function checkVerified(req, res, next) {
  const { user } = req;
  
  const redirect = Location => {
    res.writeHead(302, { Location });
    res.end();
  }
  
  if(!req.isAuthenticated()) {
    return redirect('/login');
  }
  
  if(user.email_verified === true) {
    return next()
  }
  
  redirect('/verify');
}

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

export {
  passport,
  SessionStore,
  xss,
  permit
};