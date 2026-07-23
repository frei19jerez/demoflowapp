const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  proxyTimeout: 300000,
  timeout: 300000
});

/**
 * Evita colocar dos veces el prefijo del runtime.
 */
function aplicarPrefijoRuntime(location, prefix) {
  if (!location || !prefix) {
    return location;
  }

  const prefijoLimpio = String(prefix).replace(/\/+$/, '');

  // No modificar enlaces externos.
  if (
    location.startsWith('http://') ||
    location.startsWith('https://') ||
    location.startsWith('//')
  ) {
    return location;
  }

  // Ya contiene el prefijo correcto.
  if (
    location === prefijoLimpio ||
    location.startsWith(`${prefijoLimpio}/`)
  ) {
    return location;
  }

  // Redirecciones absolutas del runtime:
  // /login -> /runtime/araujo-news/login
  // /admin -> /runtime/araujo-news/admin
  if (location.startsWith('/')) {
    return `${prefijoLimpio}${location}`;
  }

  return location;
}

/**
 * Indica si todavía es posible responder al navegador.
 */
function respuestaDisponible(res) {
  return Boolean(
    res &&
    !res.headersSent &&
    !res.writableEnded &&
    !res.destroyed
  );
}

/**
 * Error general del proxy.
 */
proxy.on('error', function (err, req, res) {
  sails.log.error(
    '🤖 IA DemoFlow: Error en el proxy runtime.'
  );

  sails.log.error(
    '❌ Detalle:',
    err && err.message
      ? err.message
      : err
  );

  if (!respuestaDisponible(res)) {
    return;
  }

  res.writeHead(502, {
    'Content-Type': 'text/html; charset=utf-8'
  });

  res.end(`
    <div style="
      font-family:Arial,sans-serif;
      padding:40px;
      max-width:700px;
      margin:auto;
    ">
      <h1>🤖 IA DemoFlow: Demo no disponible</h1>

      <p>
        DemoFlowApp perdió temporalmente la comunicación
        con la aplicación desplegada.
      </p>

      <p>
        Vuelve a intentarlo. Si el problema continúa,
        reinicia el runtime desde el panel.
      </p>

      <a
        href="/dashboard"
        style="
          display:inline-block;
          margin-top:20px;
          background:#2563eb;
          color:white;
          padding:12px 18px;
          border-radius:8px;
          text-decoration:none;
        "
      >
        Volver al dashboard
      </a>
    </div>
  `);
});

/**
 * Cabeceras que DemoFlowApp envía al proyecto desplegado.
 *
 * IMPORTANTE:
 * Aquí no se reconstruye req.body.
 *
 * El stream original de la petición se transmite directamente
 * mediante http-proxy. Esto permite formularios multipart,
 * imágenes, videos, archivos y cuerpos JSON sin alterarlos.
 */
proxy.on('proxyReq', function (proxyReq, req) {
  if (req.demoflowRuntimePrefix) {
    proxyReq.setHeader(
      'x-runtime-prefix',
      req.demoflowRuntimePrefix
    );

    proxyReq.setHeader(
      'x-forwarded-prefix',
      req.demoflowRuntimePrefix
    );
  }

  if (req.demoflowRuntimeSlug) {
    proxyReq.setHeader(
      'x-demoflow-runtime-slug',
      req.demoflowRuntimeSlug
    );
  }

  if (req.originalUrl) {
    proxyReq.setHeader(
      'x-original-url',
      req.originalUrl
    );
  }

  const forwardedProto =
    req.headers['x-forwarded-proto'] ||
    req.protocol ||
    'https';

  const forwardedHost =
    req.headers['x-forwarded-host'] ||
    req.headers.host;

  if (forwardedProto) {
    proxyReq.setHeader(
      'x-forwarded-proto',
      forwardedProto
    );
  }

  if (forwardedHost) {
    proxyReq.setHeader(
      'x-forwarded-host',
      forwardedHost
    );
  }
});

/**
 * Corrige las redirecciones devueltas por cada runtime.
 *
 * Ejemplo:
 * Location: /admin
 *
 * Se convierte en:
 * Location: /runtime/araujo-news/admin
 */
proxy.on('proxyRes', function (proxyRes, req) {
  const prefix = req.demoflowRuntimePrefix;

  if (!prefix || !proxyRes.headers) {
    return;
  }

  const location = proxyRes.headers.location;

  if (!location) {
    return;
  }

  const locationCorregido = aplicarPrefijoRuntime(
    location,
    prefix
  );

  if (locationCorregido !== location) {
    proxyRes.headers.location = locationCorregido;

    sails.log.info(
      '🧭 IA DemoFlow: Redirección runtime corregida:',
      {
        original: location,
        corregida: locationCorregido
      }
    );
  }
});

module.exports = {

  proxy: async function (req, res) {
    let proyecto = null;

    try {
      const slug = req.params.slug;

      sails.log.info(
        '🤖 IA DemoFlow: Analizando petición runtime...'
      );

      sails.log.info('🔎 Slug recibido:', slug);
      sails.log.info('📨 Método:', req.method);
      sails.log.info('🌐 URL original:', req.url);

      if (!slug) {
        return res.badRequest('Slug requerido');
      }

      proyecto = await Proyecto.findOne({ slug });

      if (!proyecto) {
        proyecto = await Proyecto.findOne({
          carpetaRuntime: slug
        });
      }

      if (!proyecto) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Proyecto runtime no encontrado.'
        );

        return res.notFound(
          'Proyecto no encontrado'
        );
      }

      if (!proyecto.puerto) {
        sails.log.error(
          '❌ IA DemoFlow: Proyecto sin puerto asignado.'
        );

        return res.serverError(
          'El proyecto no tiene puerto asignado'
        );
      }

      try {
        sails.log.info(
          '🤖 IA DemoFlow: Verificando salud del runtime...'
        );

        let health =
          await RuntimeHealthService.revisarRuntime(
            proyecto
          );

        if (health && health.ok) {
          sails.log.info(
            '✅ IA DemoFlow Runtime:',
            health.mensaje
          );
        } else {
          sails.log.warn(
            '⚠️ IA DemoFlow Runtime sin respuesta.'
          );

          sails.log.warn(
            '🔄 Intentando reinicio automático...'
          );

          try {
            if (
              typeof DeployService !== 'undefined' &&
              typeof DeployService.reiniciarRuntime ===
                'function'
            ) {
              sails.log.info(
                '🚀 Reiniciando con reiniciarRuntime()'
              );

              await DeployService.reiniciarRuntime(
                proyecto.slug ||
                  proyecto.carpetaRuntime ||
                  slug,
                proyecto.puerto,
                proyecto
              );
            } else if (
              typeof DeployService !== 'undefined' &&
              typeof DeployService.reiniciarProyecto ===
                'function'
            ) {
              sails.log.info(
                '🚀 Reiniciando con reiniciarProyecto()'
              );

              await DeployService.reiniciarProyecto(
                proyecto
              );
            } else if (
              typeof DeployService !== 'undefined' &&
              typeof DeployService.iniciarRuntime ===
                'function'
            ) {
              sails.log.info(
                '🚀 Reiniciando con iniciarRuntime()'
              );

              await DeployService.iniciarRuntime(
                proyecto
              );
            } else if (
              typeof DeployService !== 'undefined' &&
              typeof DeployService.desplegar ===
                'function'
            ) {
              sails.log.info(
                '🚀 Reiniciando con desplegar()'
              );

              await DeployService.desplegar(
                proyecto
              );
            } else {
              sails.log.warn(
                '⚠️ No encontré una función de reinicio en DeployService.'
              );
            }
          } catch (restartError) {
            sails.log.error(
              '❌ Error reiniciando runtime automáticamente.'
            );

            sails.log.error(restartError);
          }

          await new Promise(function (resolve) {
            setTimeout(resolve, 3000);
          });

          health =
            await RuntimeHealthService.revisarRuntime(
              proyecto
            );

          if (health && health.ok) {
            sails.log.info(
              '✅ Runtime revivido correctamente.'
            );
          } else {
            sails.log.warn(
              '⚠️ Runtime sigue apagado después del reinicio automático.'
            );

            sails.log.info(
              '🤖 IA DemoFlow: Mostrando pantalla de espera...'
            );

            return res.view('runtime/esperando', {
              proyecto,
              slug
            });
          }
        }
      } catch (healthError) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Health check falló.'
        );

        sails.log.warn(healthError.message);

        return res.view('runtime/esperando', {
          proyecto,
          slug
        });
      }

      const target =
        `http://127.0.0.1:${proyecto.puerto}`;

      req.demoflowRuntimePrefix =
        `/runtime/${slug}`;

      req.demoflowRuntimeSlug = slug;

      req.url = req.url.replace(
        `/runtime/${slug}`,
        ''
      );

      if (!req.url || req.url.trim() === '') {
        req.url = '/';
      }

      sails.log.info(
        '✅ IA DemoFlow: Proyecto encontrado:',
        proyecto.nombre
      );

      sails.log.info(
        '🔌 Puerto interno:',
        proyecto.puerto
      );

      sails.log.info(
        '🚀 Proxy hacia:',
        target + req.url
      );

      sails.log.info(
        '🧭 Runtime prefix enviado:',
        req.demoflowRuntimePrefix
      );

      return proxy.web(
        req,
        res,
        {
          target,
          changeOrigin: true,
          ws: true,
          proxyTimeout: 300000,
          timeout: 300000
        },
        function (proxyError) {
          sails.log.error(
            '❌ IA DemoFlow: Falló la petición al runtime:',
            proxyError && proxyError.message
              ? proxyError.message
              : proxyError
          );

          if (!respuestaDisponible(res)) {
            return;
          }

          res.status(502).send(
            'DemoFlowApp no pudo comunicarse con el runtime.'
          );
        }
      );

    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error cargando runtime.'
      );

      sails.log.error(error);

      if (!respuestaDisponible(res)) {
        return;
      }

      return res.view('runtime/esperando', {
        proyecto,
        slug: req.params.slug
      });
    }
  }

};