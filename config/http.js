const path = require('path');
const skipper = require('skipper');

module.exports.http = {

  bodyParser: skipper({
    strict: true,
    limit: '500mb'
  }),

  middleware: {

    order: [
      'startRequestTimer',
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

    staticDemos: require('serve-static')(
      path.resolve(__dirname, '..', 'assets/demos')
    )

  }

};