const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true
});

proxy.on('error', function (err, req, res) {
  sails.log.error('================ PROXY RUNTIME ERROR ================');
  sails.log.error(err);
  sails.log.error('=====================================================');

  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
  }

  if (res && res.end) {
    res.end(`
      <h1>Demo no disponible</h1>
      <p>La aplicación todavía no está iniciada o el puerto interno no responde.</p>
      <p>Vuelve al panel y presiona <strong>Iniciar deploy</strong>.</p>
    `);
  }
});

module.exports = {

  proxy: async function (req, res) {
    try {
      const slug = req.params.slug;

      if (!slug) {
        return res.badRequest('Slug requerido');
      }

      let proyecto = await Proyecto.findOne({ slug });

      if (!proyecto) {
        proyecto = await Proyecto.findOne({ carpetaRuntime: slug });
      }

      if (!proyecto) {
        return res.notFound('Proyecto no encontrado');
      }

      if (!proyecto.puerto) {
        return res.serverError('El proyecto no tiene puerto asignado');
      }

      const target = `http://127.0.0.1:${proyecto.puerto}`;

      req.url = req.url.replace(`/runtime/${slug}`, '') || '/';

      sails.log.info('🚀 Proxy runtime =>', target + req.url);

      return proxy.web(req, res, {
        target,
        changeOrigin: true,
        ws: true
      });

    } catch (error) {
      sails.log.error('================ RUNTIME ERROR ================');
      sails.log.error(error);
      sails.log.error('================================================');

      return res.serverError('Error cargando runtime');
    }
  }

};