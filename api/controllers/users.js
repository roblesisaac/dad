import { params } from '@ampt/sdk';
import { passport } from '../middlewares/passport';
import Users from '../schemas/users';
import { proper } from '../../src/utils';
import { sendVerificationCode } from '../../api/events/users.js';

const { APP_NAME } = params().list();

function loginUser(req, res, user) {
    const { email, email_verified } = user;
  
    req.logIn(user, (err) => {
      if (err) { 
        console.log({ err });
        return res.status(400).json(err); 
      }
  
      const learn = {
        user: { email }
      };
  
      if(email_verified !== true) {
        console.log(`${email} has not been verified yet...`);
  
        return res.json({
          learn, 
          redirect: '/verify'
        });
      }
      
      return res.json({ learn, redirect: '/' });
    });
}

export async function getUserByEmail(req, res) {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    const error = (errorMessage) => res.status(500).json(errorMessage);

    if(!email) {
        return error(`No email provided.`)
    }

    if(!user) {        
        console.error(error.message);
        return error(`${email} not found.`)
    }

    res.json(user);
}

export function loginLocal(req, res, next) {
    const callback = async (err, user) => {
      if (err) {
        return res.status(400).json(err); 
      }
    
      loginUser(req, res, user);
    };
  
    const InitLocal = passport.authenticate('local', callback);
    InitLocal(req, res, next);
}

export const loginGoogle = passport.authenticate('google', { scope: ['email'] });

export const googleCallback = passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' });

export async function signupUser(req, res) {
    const { email, password } = req.body;
    
    try {
        const newUser = await Users.save({ email, password });
  
        loginUser(req, res, newUser);
    } catch (error) {
        console.log(error);
        res.status(400).json(error.message);
    }
}

export async function verifyUser(req, res) {
    const { user } = req;

    if(!user) {
      return res
      .status(400)
      .json('To verify your account, you must first log in.');
    }
  
    const { email } = user;
    const { code } = req.body;
  
    const dbUser = await Users.findOne({ email });
  
    if(!dbUser) {
      return res
        .status(400)
        .json(`Unexpected error: '${email}' not found.`);
    }
  
    const { email_verified } = dbUser;
  
    if(email_verified != code) {
      return res
        .status(400)
        .json(`The code you entered is incorrect. Please check and try again.`);
    }
    
    await Users.update({ email }, { email_verified: true });
  
    res.json({ redirect: '/' });
}

export async function resendVerificationCode (req, res) {
    const { user } = req;
  
    if(!user) {
      return res.json('To resend a verification code, you must first log in.');
    }
  
    const { email } = user;
  
    if(!email) {
      return res.json(`Unexpected error: email not found.`);
    }
  
    await sendVerificationCode(email, { 
      subject: `Your New Verification Code - ${proper(APP_NAME)}`
    });
  
    res.json(`New verification code sent to: ${email}.`);
}

export function isLoggedIn(req, res) {
  const { user } = req;
  const { email_verified } = user || {};
  
  res.json({ 
    isLoggedIn: !!user,
    email_verified
  });
}

export function logoutUser(req, res) {
    req.logout(err => {
        if (err) console.log(err);
        res.redirect('/');
    });
}