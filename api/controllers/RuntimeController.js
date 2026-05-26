const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000
});

proxy.on('error', function(err, req, res) {
  sails.log.error('🤖 IA DemoFlow: Error en el proxy runtime.');
  sails.log.error('❌ Detalle:', err.message);

  if (res && !res.headersSent) {
    res.writeHead(502, {
      'Content-Type': 'text/html; charset=utf-8'
    });
  }

  if (res && res.end) {
    res.end(`
      <div style="font-family:Arial;padding:40px;max-width:700px;margin:auto;">
        <h1>🤖 IA DemoFlow: Demo no disponible</h1>
        <p>La aplicación todavía no está iniciada o el puerto interno no responde.</p>
        <p>DemoFlow intentó conectarse al runtime, pero no recibió respuesta.</p>
        <p>Vuelve al panel y presiona <strong>Reiniciar</strong> o <strong>Iniciar deploy</strong>.</p>
        <a href="/dashboard" style="display:inline-block;margin-top:20px;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">
          Volver al dashboard
        </a>
      </div>
    `);
  }
});

proxy.on('proxyReq', function(proxyReq, req) {
  if (
    req.body &&
    Object.keys(req.body).length > 0 &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {
    const bodyData = JSON.stringify(req.body);

    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));

    proxyReq.write(bodyData);
  }
});

module.exports = {

  proxy: async function(req, res) {
    try {

      const slug = req.params.slug;

      sails.log.info('🤖 IA DemoFlow: Analizando petición runtime...');
      sails.log.info('🔎 Slug recibido:', slug);
      sails.log.info('📨 Método:', req.method);
      sails.log.info('🌐 URL original:', req.url);

      if (!slug) {
        return res.badRequest('Slug requerido');
      }

      // =====================================
      // BUSCAR PROYECTO
      // =====================================

      let proyecto = await Proyecto.findOne({
        slug
      });

      if (!proyecto) {
        proyecto = await Proyecto.findOne({
          carpetaRuntime: slug
        });
      }

      if (!proyecto) {
        sails.log.warn('⚠️ IA DemoFlow: Proyecto runtime no encontrado.');
        return res.notFound('Proyecto no encontrado');
      }

      if (!proyecto.puerto) {
        sails.log.error('❌ IA DemoFlow: Proyecto sin puerto asignado.');
        return res.serverError('El proyecto no tiene puerto asignado');
      }

      // =====================================
      // HEALTH CHECK + AUTO RESTART IA
      // =====================================

      try {

        sails.log.info('🤖 IA DemoFlow: Verificando salud del runtime...');

        let health = await RuntimeHealthService.revisarRuntime(proyecto);

        // ============================
        // SI ESTÁ ONLINE
        // ============================

        if (health && health.ok) {

          sails.log.info('✅ IA DemoFlow Runtime:', health.mensaje);

        } else {

          sails.log.warn('⚠️ IA DemoFlow Runtime sin respuesta.');
          sails.log.warn('🔄 Intentando reinicio automático...');

          // ============================
          // REINICIAR AUTOMÁTICAMENTE
          // ============================

          try {

            if (
              typeof DeployService !== 'undefined' &&
              DeployService.reiniciarProyecto
            ) {

              sails.log.info('🚀 Reiniciando con reiniciarProyecto()');

              await DeployService.reiniciarProyecto(proyecto);

            } else if (
              typeof DeployService !== 'undefined' &&
              DeployService.iniciarRuntime
            ) {

              sails.log.info('🚀 Reiniciando con iniciarRuntime()');

              await DeployService.iniciarRuntime(proyecto);

            } else if (
              typeof DeployService !== 'undefined' &&
              DeployService.desplegar
            ) {

              sails.log.info('🚀 Reiniciando con desplegar()');

              await DeployService.desplegar(proyecto);

            } else {

              sails.log.warn('⚠️ No encontré función de reinicio en DeployService.');

            }

          } catch (restartError) {

            sails.log.error('❌ Error reiniciando runtime automáticamente.');
            sails.log.error(restartError);

          }

          // ============================
          // ESPERAR UN POCO
          // ============================

          await new Promise(resolve => setTimeout(resolve, 5000));

          // ============================
          // REVISAR DE NUEVO
          // ============================

          health = await RuntimeHealthService.revisarRuntime(proyecto);

          if (health && health.ok) {

            sails.log.info('✅ Runtime revivido correctamente.');

          } else {

            sails.log.warn('⚠️ Runtime sigue apagado después del reinicio automático.');

          }

        }

      } catch (healthError) {

        sails.log.warn('⚠️ IA DemoFlow: Health check falló.');
        sails.log.warn(healthError.message);

      }

      // =====================================
      // PROXY RUNTIME
      // =====================================

      const target = `http://127.0.0.1:${proyecto.puerto}`;

      req.url = req.url.replace(`/runtime/${slug}`, '');

      if (!req.url || req.url.trim() === '') {
        req.url = '/';
      }

      sails.log.info('✅ IA DemoFlow: Proyecto encontrado:', proyecto.nombre);
      sails.log.info('🔌 Puerto interno:', proyecto.puerto);
      sails.log.info('🚀 Proxy hacia:', target + req.url);

      return proxy.web(req, res, {
        target,
        changeOrigin: true,
        ws: true,
        proxyTimeout: 30000,
        timeout: 30000
      });

    } catch (error) {

      sails.log.error('❌ IA DemoFlow: Error cargando runtime.');
      sails.log.error(error);

      return res.serverError('Error cargando runtime');

    }
  }

};