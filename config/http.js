const path = require('path');
const skipper = require('skipper');

const skipperMiddleware = skipper({
  strict: true,
  limit: '500mb'
});

/**
 * DemoFlowApp actúa como proxy transparente para las aplicaciones hijas.
 *
 * Las rutas /runtime/:slug deben conservar el stream original de la petición
 * para poder reenviar correctamente:
 *
 * - multipart/form-data
 * - imágenes
 * - videos
 * - archivos ZIP
 * - PDFs
 * - JSON
 * - formularios tradicionales
 *
 * Si Skipper procesa primero una petición multipart, consume el stream y los
 * archivos ya no pueden llegar al runtime hijo.
 */
function bodyParserDemoFlow(req, res, next) {
  const url = String(
    req.originalUrl ||
    req.url ||
    ''
  );

  if (
    url === '/runtime' ||
    url.startsWith('/runtime/')
  ) {
    return next();
  }

  return skipperMiddleware(req, res, next);
}

module.exports.http = {

  /**
   * Render y Cloudflare funcionan como proxies delante de DemoFlowApp.
   */
  trustProxy: true,

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

    bodyParser: bodyParserDemoFlow,

    staticDemos: require('serve-static')(
      path.resolve(__dirname, '..', 'assets/demos')
    )

  }

};