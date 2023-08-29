import { params } from '@ampt/sdk';
import { passport } from '../middlewares/passport';
import { proper } from '../../src/utils';
import { sendVerificationCode } from '../../api/events/users.js';
import Users from '../models/users';
import userApp from '../controllers/users';

const { APP_NAME } = params().list();

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

export const loginGoogle = passport.authenticate('google', { scope: ['email'] });

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    if (err || !user) {
      return res.redirect('/login');
    }

    req.logIn(user, async (err) => {
      if (err) {
        return res.redirect('/login');
      }

      const { views } = await userApp.getUserPages(user);
      const redirectUrl = `/${views[0] || ''}`;

      return res.redirect(redirectUrl);
    });
  })(req, res, next);
};

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

function loginUser(req, res, user) {
  const { email, email_verified } = user;
  
  
  req.logIn(user, async (err) => {
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

    const { views } = await userApp.getUserPages(user);
    const redirect = `/${views[0] || ''}`;
    
    return res.json({ learn, redirect });
  });
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

export function resetTemporaryPassword(_, res) {
  res.send('Password has been reset');
}

export function sendPasswordResetRequest(req, res) {
  const { email } = req.params;

  res.json(`sending reset info to ${email}`);
}

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
  
  const dbUser = await Users.findUser(email);
  
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
  
  await Users.updateUser(email, { email_verified: true });

  const { views } = await userApp.getUserPages(user);
  const redirect = `/${views[0] || ''}`;
  
  res.json({ redirect });
}