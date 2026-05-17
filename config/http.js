const path = require('path');

module.exports.http = {

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