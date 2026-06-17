/**
 * Session Configuration
 * (sails.config.session)
 */

module.exports.session = {

  secret: process.env.SESSION_SECRET || '78e735772b824e99011afb91605e870f',

  name: 'demoflow.sid',

  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }

};