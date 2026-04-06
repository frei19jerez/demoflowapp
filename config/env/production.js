module.exports = {

  sockets: {
    onlyAllowOrigins: [
      'https://demoflowapp.onrender.com',
      'https://demoflow.com',
      'https://www.demoflow.com'
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