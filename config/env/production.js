/**
 * Production environment settings
 * (sails.config.*)
 */

module.exports = {

  models: {

    // 🔥 IMPORTANTE PARA RENDER
    migrate: 'safe'

  },

  sockets: {
    onlyAllowOrigins: [
      'https://demoflowapp.onrender.com',
      'https://demoflowapp.com',
      'https://www.demoflowapp.com'
    ]
  },

  http: {
    trustProxy: true
  },

  session: {
    cookie: {

      secure: process.env.NODE_ENV === 'production'

    }
  }

};