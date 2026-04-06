module.exports = {

  sockets: {
    onlyAllowOrigins: [
      'https://demoflowapp.onrender.com',
      'https://demoflow.app',
      'https://www.demoflow.app'
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