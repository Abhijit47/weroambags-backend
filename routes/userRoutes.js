const express = require('express');
const passport = require('passport');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

const userController = require('../controllers/userController');

router.route('/register').post(userController.register);

router.route('/login').post(userController.login);

router.route('/auth/google').get(
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router
  .route('/auth/callback/google')
  .get(
    passport.authenticate('google', { passReqToCallback: true }),
    userController.SignInWithGoogle
  );

router
  .route('/auth/facebook')
  .get(
    passport.authenticate('facebook', { scope: ['public_profile', 'email'] })
  );

router
  .route('/auth/callback/facebook')
  .get(
    passport.authenticate('facebook', { passReqToCallback: true }),
    userController.SignInWithFacebook
  );

router.route('/me').get(authMiddleware.protect, userController.getMe);

router
  .route('/get-users')
  .get(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    userController.getUsers
  );

module.exports = router;
