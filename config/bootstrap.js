module.exports.bootstrap = async function () {

  sails.getBaseUrl = function () {

    if (process.env.NODE_ENV === 'production') {
      return 'https://demoflowapp.com';
    }

    return 'http://localhost:1337';
  };

};