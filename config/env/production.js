module.exports = {

  sockets: {
    onlyAllowOrigins: [
      'https://demoflowapp.onrender.com'
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