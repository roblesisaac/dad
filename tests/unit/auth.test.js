import { isLoggedIn, logoutUser, loginGoogle, googleCallback, loginLocal, resendVerificationCode, resetTemporaryPassword, sendPasswordResetRequest, signupUser, verifyUser } from '../../api/controllers/auth';
import { passport } from '../../api/middlewares/passport';
import Users from '../../api/models/users';
import userApp from '../../api/controllers/users';

jest.mock('../../api/middlewares/passport');
jest.mock('../../api/models/users');
jest.mock('../../api/controllers/users');
jest.mock('@ampt/sdk');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: null, body: {}, params: {}, logout: jest.fn(), logIn: jest.fn() };
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), redirect: jest.fn() };
    next = jest.fn();
  });

  test('isLoggedIn', () => {
    isLoggedIn(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('logoutUser', () => {
    logoutUser(req, res);
    expect(req.logout).toHaveBeenCalled();
  });

  test('loginGoogle', () => {
    loginGoogle(req, res, next);
    expect(passport.authenticate).toHaveBeenCalled();
  });

  test('googleCallback', () => {
    googleCallback(req, res, next);
    expect(passport.authenticate).toHaveBeenCalled();
  });

  test('loginLocal', () => {
    loginLocal(req, res, next);
    expect(passport.authenticate).toHaveBeenCalled();
  });

  test('resendVerificationCode', async () => {
    await resendVerificationCode(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('resetTemporaryPassword', () => {
    resetTemporaryPassword(req, res);
    expect(res.send).toHaveBeenCalled();
  });

  test('sendPasswordResetRequest', () => {
    sendPasswordResetRequest(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('signupUser', async () => {
    req.body = { email: 'test@test.com', password: 'password' };
    Users.save.mockResolvedValue(req.body);
    await signupUser(req, res);
    expect(Users.save).toHaveBeenCalledWith(req.body);
  });

  test('verifyUser', async () => {
    req.user = { email: 'test@test.com' };
    req.body = { code: '123456' };
    Users.findUser.mockResolvedValue({ email_verified: req.body.code });
    userApp.getUserPages.mockResolvedValue({ views: [] });
    await verifyUser(req, res);
    expect(Users.findUser).toHaveBeenCalledWith(req.user.email);
  });
});