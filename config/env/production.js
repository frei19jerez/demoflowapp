module.exports = {

  models: {
    // TEMPORAL: solo para que Sails cree la tabla proyecto_runtime
    migrate: 'alter'
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