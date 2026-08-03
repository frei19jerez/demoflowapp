const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
  proxyTimeout: 300000,
  timeout: 300000
});

/**
 * Limpia y normaliza el prefijo público de un runtime.
 *
 * Ejemplo:
 * /runtime/fj-ia/ -> /runtime/fj-ia
 */
function normalizarPrefijoRuntime(prefix) {
  if (!prefix) {
    return '';
  }

  let prefijo = String(prefix).trim();

  if (!prefijo) {
    return '';
  }

  if (!prefijo.startsWith('/')) {
    prefijo = `/${prefijo}`;
  }

  prefijo = prefijo.replace(/\/+/g, '/');
  prefijo = prefijo.replace(/\/+$/, '');

  return prefijo;
}

/**
 * Evita colocar dos veces el prefijo del runtime.
 *
 * Ejemplos:
 *
 * /login
 * -> /runtime/fj-ia/login
 *
 * /runtime/fj-ia/login
 * -> /runtime/fj-ia/login
 */
function aplicarPrefijoRuntime(location, prefix) {
  if (!location || !prefix) {
    return location;
  }

  const prefijoLimpio =
    normalizarPrefijoRuntime(prefix);

  if (!prefijoLimpio) {
    return location;
  }

  const locationTexto = String(location).trim();

  if (!locationTexto) {
    return location;
  }

  /*
   * No modificar enlaces externos completos.
   */
  if (
    locationTexto.startsWith('http://') ||
    locationTexto.startsWith('https://') ||
    locationTexto.startsWith('//')
  ) {
    return locationTexto;
  }

  /*
   * Ya contiene el prefijo correcto.
   */
  if (
    locationTexto === prefijoLimpio ||
    locationTexto.startsWith(`${prefijoLimpio}/`) ||
    locationTexto.startsWith(`${prefijoLimpio}?`) ||
    locationTexto.startsWith(`${prefijoLimpio}#`)
  ) {
    return locationTexto;
  }

  /*
   * Redirecciones absolutas del runtime:
   *
   * /login
   * -> /runtime/fj-ia/login
   */
  if (locationTexto.startsWith('/')) {
    return `${prefijoLimpio}${locationTexto}`;
  }

  /*
   * Redirecciones relativas:
   *
   * login
   * -> /runtime/fj-ia/login
   */
  return `${prefijoLimpio}/${locationTexto}`;
}

/**
 * Construye la URL interna que se enviará al runtime.
 *
 * El navegador solicita:
 *
 * /runtime/fj-ia/login?next=/dashboard
 *
 * El runtime recibe:
 *
 * /login?next=/dashboard
 */
function obtenerUrlInternaRuntime(req, prefix) {
  const prefijoLimpio =
    normalizarPrefijoRuntime(prefix);

  let urlActual =
    req.url ||
    req.originalUrl ||
    '/';

  urlActual = String(urlActual);

  /*
   * En algunas configuraciones de Sails/Express req.url todavía
   * contiene /runtime/:slug.
   */
  if (
    prefijoLimpio &&
    (
      urlActual === prefijoLimpio ||
      urlActual.startsWith(`${prefijoLimpio}/`) ||
      urlActual.startsWith(`${prefijoLimpio}?`)
    )
  ) {
    urlActual = urlActual.slice(
      prefijoLimpio.length
    );
  }

  if (!urlActual) {
    return '/';
  }

  if (urlActual.startsWith('?')) {
    return `/${urlActual}`;
  }

  if (!urlActual.startsWith('/')) {
    return `/${urlActual}`;
  }

  return urlActual;
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
 * Ajusta el Path de una cookie para que pertenezca
 * únicamente al runtime correspondiente.
 *
 * Ejemplo:
 *
 * Path=/
 * -> Path=/runtime/fj-ia
 */
function aplicarRutaCookie(cookie, prefix) {
  if (!cookie || !prefix) {
    return cookie;
  }

  const prefijoLimpio =
    normalizarPrefijoRuntime(prefix);

  if (!prefijoLimpio) {
    return cookie;
  }

  let cookieCorregida = String(cookie);

  /*
   * Si ya tiene el prefijo correcto no se modifica.
   */
  const pathRuntimeRegex = new RegExp(
    `Path=${escaparRegex(prefijoLimpio)}(?:;|$)`,
    'i'
  );

  if (pathRuntimeRegex.test(cookieCorregida)) {
    return cookieCorregida;
  }

  /*
   * Cambiar cualquier Path existente.
   */
  if (/Path=[^;]*/i.test(cookieCorregida)) {
    cookieCorregida = cookieCorregida.replace(
      /Path=[^;]*/i,
      `Path=${prefijoLimpio}`
    );

    return cookieCorregida;
  }

  /*
   * Si la cookie no declara Path, agregarlo.
   */
  return `${cookieCorregida}; Path=${prefijoLimpio}`;
}

/**
 * Escapa texto para utilizarlo dentro de una expresión regular.
 */
function escaparRegex(valor) {
  return String(valor).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

/**
 * Obtiene el protocolo público original.
 */
function obtenerProtocoloPublico(req) {
  const headerProto =
    req.headers['x-forwarded-proto'];

  if (headerProto) {
    return String(headerProto)
      .split(',')[0]
      .trim();
  }

  if (req.protocol) {
    return req.protocol;
  }

  return 'https';
}

/**
 * Obtiene el host público original.
 */
function obtenerHostPublico(req) {
  const forwardedHost =
    req.headers['x-forwarded-host'];

  if (forwardedHost) {
    return String(forwardedHost)
      .split(',')[0]
      .trim();
  }

  return req.headers.host || '';
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
 *
 * Aquí no se reconstruye req.body.
 *
 * El stream original de la petición se transmite directamente
 * mediante http-proxy. Esto permite formularios multipart,
 * imágenes, videos, archivos y cuerpos JSON sin alterarlos.
 */
proxy.on('proxyReq', function (proxyReq, req) {
  const prefix =
    normalizarPrefijoRuntime(
      req.demoflowRuntimePrefix
    );

  const slug =
    req.demoflowRuntimeSlug || '';

  const originalUrl =
    req.demoflowOriginalUrl ||
    req.originalUrl ||
    req.url ||
    '/';

  const forwardedProto =
    obtenerProtocoloPublico(req);

  const forwardedHost =
    obtenerHostPublico(req);

  /*
   * Headers principales para que FJ-IA pueda detectar:
   *
   * /runtime/fj-ia
   */
  if (prefix) {
    proxyReq.setHeader(
      'x-runtime-prefix',
      prefix
    );

    proxyReq.setHeader(
      'x-forwarded-prefix',
      prefix
    );

    /*
     * Nombres alternativos reconocidos por diferentes
     * frameworks y middlewares.
     */
    proxyReq.setHeader(
      'x-forwarded-pathbase',
      prefix
    );

    proxyReq.setHeader(
      'x-script-name',
      prefix
    );

    proxyReq.setHeader(
      'x-demoflow-runtime-prefix',
      prefix
    );
  }

  if (slug) {
    proxyReq.setHeader(
      'x-demoflow-runtime-slug',
      slug
    );
  }

  if (originalUrl) {
    proxyReq.setHeader(
      'x-original-url',
      originalUrl
    );

    proxyReq.setHeader(
      'x-forwarded-uri',
      originalUrl
    );

    proxyReq.setHeader(
      'x-original-uri',
      originalUrl
    );
  }

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

    proxyReq.setHeader(
      'x-forwarded-server',
      forwardedHost
    );
  }

  /*
   * Conservar la IP original cuando esté disponible.
   */
  const forwardedFor =
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress;

  if (forwardedFor) {
    proxyReq.setHeader(
      'x-forwarded-for',
      forwardedFor
    );
  }

  sails.log.info(
    '📨 IA DemoFlow: Headers enviados al runtime:',
    {
      slug,
      prefix,
      originalUrl,
      forwardedProto,
      forwardedHost,
      urlInterna: req.url
    }
  );
});

/**
 * Corrige respuestas generadas por cada runtime.
 *
 * 1. Corrige redirecciones Location.
 * 2. Corrige Path de cookies de sesión.
 *
 * Ejemplo:
 *
 * Location: /login
 *
 * Se convierte en:
 *
 * Location: /runtime/fj-ia/login
 */
proxy.on('proxyRes', function (proxyRes, req) {
  const prefix =
    normalizarPrefijoRuntime(
      req.demoflowRuntimePrefix
    );

  if (!prefix || !proxyRes.headers) {
    return;
  }

  /*
   * Corregir redirecciones HTTP.
   */
  const location =
    proxyRes.headers.location;

  if (location) {
    const locationCorregido =
      aplicarPrefijoRuntime(
        location,
        prefix
      );

    if (locationCorregido !== location) {
      proxyRes.headers.location =
        locationCorregido;

      sails.log.info(
        '🧭 IA DemoFlow: Redirección runtime corregida:',
        {
          original: location,
          corregida: locationCorregido
        }
      );
    }
  }

  /*
   * Corregir cookies de sesión.
   *
   * Esto evita que una cookie del runtime use Path=/
   * y choque con DemoFlowApp u otro runtime.
   */
  const setCookie =
    proxyRes.headers['set-cookie'];

  if (Array.isArray(setCookie)) {
    proxyRes.headers['set-cookie'] =
      setCookie.map(function (cookie) {
        return aplicarRutaCookie(
          cookie,
          prefix
        );
      });

    sails.log.info(
      '🍪 IA DemoFlow: Ruta de cookies ajustada:',
      prefix
    );
  } else if (typeof setCookie === 'string') {
    proxyRes.headers['set-cookie'] = [
      aplicarRutaCookie(
        setCookie,
        prefix
      )
    ];

    sails.log.info(
      '🍪 IA DemoFlow: Ruta de cookie ajustada:',
      prefix
    );
  }
});

module.exports = {

  proxy: async function (req, res) {
    let proyecto = null;
    let slug = null;

    try {
      slug = req.params.slug;

      sails.log.info(
        '🤖 IA DemoFlow: Analizando petición runtime...'
      );

      sails.log.info(
        '🔎 Slug recibido:',
        slug
      );

      sails.log.info(
        '📨 Método:',
        req.method
      );

      sails.log.info(
        '🌐 req.url recibida:',
        req.url
      );

      sails.log.info(
        '🌐 req.originalUrl recibida:',
        req.originalUrl
      );

      if (!slug) {
        return res.badRequest(
          'Slug requerido'
        );
      }

      proyecto = await Proyecto.findOne({
        slug
      });

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

      /*
       * Verificación de salud del runtime.
       */
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

            sails.log.error(
              restartError
            );
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

            return res.view(
              'runtime/esperando',
              {
                proyecto,
                slug
              }
            );
          }
        }
      } catch (healthError) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Health check falló.'
        );

        sails.log.warn(
          healthError &&
          healthError.message
            ? healthError.message
            : healthError
        );

        return res.view(
          'runtime/esperando',
          {
            proyecto,
            slug
          }
        );
      }

      const target =
        `http://127.0.0.1:${proyecto.puerto}`;

      const prefix =
        normalizarPrefijoRuntime(
          `/runtime/${slug}`
        );

      /*
       * Guardamos los valores antes de modificar req.url.
       *
       * Estos datos serán utilizados en proxyReq y proxyRes.
       */
      req.demoflowRuntimePrefix =
        prefix;

      req.demoflowRuntimeSlug =
        slug;

      req.demoflowOriginalUrl =
        req.originalUrl ||
        req.url ||
        prefix;

      /*
       * El runtime debe recibir su ruta interna sin:
       *
       * /runtime/fj-ia
       */
      req.url =
        obtenerUrlInternaRuntime(
          req,
          prefix
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

      sails.log.info(
        '🌍 URL pública original:',
        req.demoflowOriginalUrl
      );

      sails.log.info(
        '🏠 URL interna entregada al runtime:',
        req.url
      );

      return proxy.web(
        req,
        res,
        {
          target,
          changeOrigin: true,
          ws: true,
          proxyTimeout: 300000,
          timeout: 300000,

          /*
           * Conserva correctamente los headers originales
           * y permite que proxyReq agregue los de DemoFlowApp.
           */
          preserveHeaderKeyCase: false
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

          return res.status(502).send(
            'DemoFlowApp no pudo comunicarse con el runtime.'
          );
        }
      );
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error cargando runtime.'
      );

      sails.log.error(
        error
      );

      if (!respuestaDisponible(res)) {
        return;
      }

      return res.view(
        'runtime/esperando',
        {
          proyecto,
          slug:
            slug ||
            req.params.slug
        }
      );
    }
  }

};