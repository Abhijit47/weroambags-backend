const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const PassportCustom = require('passport-custom').Strategy;

function initialize(passport) {
  // Custom Strategy
  passport.use(
    'my-auth',
    new PassportCustom(function (req, cb) {
      // console.log('req', req.body);
      // console.log('cb', cb);
      return cb(null, { email: req.body.email, password: req.body.password });
    })
  );

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:9999/api/v1/user/auth/callback/google',
      },
      function (accessToken, refreshToken, profile, cb) {
        // console.log('profile', profile);
        // console.log('accessToken', accessToken);
        // console.log('refreshToken', refreshToken);
        return cb(null, profile);
      }
    )
  );

  // Facebook Strategy
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: 'http://localhost:9999/api/v1/user/auth/callback/facebook',
      },
      function (accessToken, refreshToken, profile, cb) {
        // console.log('profile', profile);
        // console.log('accessToken', accessToken);
        // console.log('refreshToken', refreshToken);
        return cb(null, profile);
      }
    )
  );

  passport.serializeUser((user, cb) => cb(null, user));

  passport.deserializeUser((user, cb) => cb(null, user));
}

module.exports = initialize;
