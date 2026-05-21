const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true
});

proxy.on('error', function (err, req, res) {
  sails.log.error('🤖 IA DemoFlow: Error en el proxy runtime.');
  sails.log.error('❌ Detalle:', err.message);

  if (res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
  }

  if (res && res.end) {
    res.end(`
      <h1>🤖 IA DemoFlow: Demo no disponible</h1>
      <p>La aplicación todavía no está iniciada o el puerto interno no responde.</p>
      <p>Vuelve al panel y presiona <strong>Iniciar deploy</strong>.</p>
    `);
  }
});

proxy.on('proxyReq', function(proxyReq, req) {

  if (
    req.body &&
    Object.keys(req.body).length > 0 &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {

    sails.log.info('🤖 IA DemoFlow: Detecté datos enviados por formulario.');
    sails.log.info('📦 IA DemoFlow Body:', req.body);
    sails.log.info('🚀 IA DemoFlow: Reenviando datos al runtime hijo...');

    const bodyData = JSON.stringify(req.body);

    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

    proxyReq.write(bodyData);

  }

});

module.exports = {

  proxy: async function (req, res) {
    try {

      const slug = req.params.slug;

      sails.log.info('🤖 IA DemoFlow: Analizando petición runtime...');
      sails.log.info('🔎 Slug recibido:', slug);
      sails.log.info('📨 Método:', req.method);
      sails.log.info('🌐 URL original:', req.url);

      if (!slug) {
        sails.log.warn('⚠️ IA DemoFlow: No recibí slug del proyecto.');
        return res.badRequest('Slug requerido');
      }

      let proyecto = await Proyecto.findOne({ slug });

      if (!proyecto) {
        sails.log.info('🤖 IA DemoFlow: No encontré por slug, buscaré por carpetaRuntime...');
        proyecto = await Proyecto.findOne({ carpetaRuntime: slug });
      }

      if (!proyecto) {
        sails.log.warn('⚠️ IA DemoFlow: Proyecto runtime no encontrado.');
        return res.notFound('Proyecto no encontrado');
      }

      if (!proyecto.puerto) {
        sails.log.error('❌ IA DemoFlow: El proyecto existe pero no tiene puerto asignado.');
        return res.serverError('El proyecto no tiene puerto asignado');
      }

      const target = `http://127.0.0.1:${proyecto.puerto}`;

      req.url = req.url.replace(`/runtime/${slug}`, '') || '/';

      sails.log.info('✅ IA DemoFlow: Proyecto encontrado:', proyecto.nombre);
      sails.log.info('🔌 IA DemoFlow: Puerto interno:', proyecto.puerto);
      sails.log.info('🚀 IA DemoFlow: Enviando petición al runtime:', target + req.url);
      sails.log.info('📦 IA DemoFlow Body:', req.body);

      return proxy.web(req, res, {
        target,
        changeOrigin: true,
        ws: true
      });

    } catch (error) {

      sails.log.error('❌ IA DemoFlow: Error cargando runtime.');
      sails.log.error(error);

      return res.serverError('Error cargando runtime');

    }
  }

};