const path = require('path');
const skipper = require('skipper');

module.exports.http = {

  middleware: {

    order: [
      'cookieParser',
      'session',
      'bodyParser',
      'compress',
      'poweredBy',
      'router',
      'www',
      'favicon',
      'staticDemos'
    ],

    bodyParser: skipper({
      strict: true,
      limit: '500mb'
    }),

    staticDemos: require('serve-static')(
      path.resolve(__dirname, '..', 'assets/demos')
    )

  }

};