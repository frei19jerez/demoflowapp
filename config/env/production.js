module.exports = {

  datastores: {
    default: {
      adapter: 'sails-postgresql',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  },

  models: {
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
      secure: true
    }
  }

};