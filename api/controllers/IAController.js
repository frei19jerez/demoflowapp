/**
 * IAController.js
 * Controlador central de inteligencia artificial de DemoFlowApp
 *
 * Funciones locales gratuitas:
 * - Detectar tipo de proyecto desde formularios.
 * - Sugerir una descripción básica.
 * - Calcular estadísticas básicas del dashboard.
 *
 * Funciones avanzadas con OpenAI:
 * - Analizar un proyecto.
 * - Sugerir una descripción comercial.
 * - Analizar el dashboard.
 * - Chat con DemoFlow IA.
 * - Explicar errores.
 * - Generar README.
 * - Revisar seguridad.
 * - Analizar SEO.
 * - Analizar potencial comercial.
 * - Analizar arquitectura.
 *
 * Las funciones avanzadas:
 * - Validan usuario.
 * - Validan propiedad del proyecto.
 * - Descuentan diamantes mediante DemoFlowIAService.
 * - Devuelven los diamantes si OpenAI falla.
 * - Registran historial y consumo.
 */

'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {

  // =========================================
  // UTILIDADES
  // =========================================

  normalizarTexto: function (valor) {
    return String(
      typeof valor === 'undefined' ||
      valor === null
        ? ''
        : valor
    ).trim();
  },

  obtenerUsuarioSesion: function (req) {
    if (
      !req ||
      !req.session ||
      !req.session.userId
    ) {
      return null;
    }

    const usuarioId =
      Number(req.session.userId);

    return (
      Number.isSafeInteger(usuarioId) &&
      usuarioId > 0
    )
      ? usuarioId
      : null;
  },

  obtenerProyectoId: function (req) {
    const valor =
      req.params.id ||
      req.body.proyectoId ||
      req.body.proyecto ||
      req.query.proyectoId ||
      req.query.proyecto ||
      null;

    const proyectoId =
      Number(valor);

    return (
      Number.isSafeInteger(proyectoId) &&
      proyectoId > 0
    )
      ? proyectoId
      : null;
  },

  obtenerMensajePublicoError:
  function (error) {
    const codigo =
      error && error.code
        ? String(error.code)
        : '';

    if (
      codigo ===
      'IA_CREDITOS_INSUFICIENTES'
    ) {
      return (
        error.message ||
        'No tienes suficientes diamantes.'
      );
    }

    if (
      codigo === 'IA_SIN_ACCESO'
    ) {
      return (
        'No tienes acceso a DemoFlow IA. ' +
        'Activa un plan Premium.'
      );
    }

    if (
      codigo ===
      'OPENAI_API_KEY_MISSING'
    ) {
      return (
        'DemoFlow IA todavía no está configurada.'
      );
    }

    if (
      codigo ===
      'OPENAI_TIMEOUT'
    ) {
      return (
        'DemoFlow IA tardó demasiado en responder. ' +
        'Intenta nuevamente.'
      );
    }

    if (
      codigo ===
      'IA_SOLICITUD_EN_PROCESO'
    ) {
      return (
        'Ya tienes una solicitud de IA en proceso.'
      );
    }

    if (
      codigo ===
      'IA_SALDO_MODIFICADO'
    ) {
      return (
        'Tu saldo cambió mientras se procesaba la solicitud. ' +
        'Intenta nuevamente.'
      );
    }

    if (
      codigo ===
      'OPENAI_API_ERROR'
    ) {
      return (
        'El proveedor de inteligencia artificial ' +
        'no pudo procesar la solicitud.'
      );
    }

    return (
      error &&
      error.message
        ? error.message
        : 'DemoFlow IA no pudo completar la solicitud.'
    );
  },

  buscarUsuarioActual:
  async function (req) {
    const usuarioId =
      this.obtenerUsuarioSesion(req);

    if (!usuarioId) {
      return null;
    }

    return await Usuario.findOne({
      id: usuarioId
    });
  },

  buscarProyectoUsuario:
  async function (
    proyectoId,
    usuarioId
  ) {
    if (
      !proyectoId ||
      !usuarioId
    ) {
      return null;
    }

    return await Proyecto.findOne({
      id: proyectoId,
      usuario: usuarioId
    });
  },

  obtenerRutaProyecto:
  function (proyecto) {
    if (!proyecto) {
      return null;
    }

    const posiblesRutas = [
      proyecto.rutaProyecto,
      proyecto.rutaLocal,
      proyecto.ruta,
      proyecto.carpetaProyecto,
      proyecto.directorio,
      proyecto.path,
      proyecto.deployPath,
      proyecto.runtimePath
    ];

    for (
      const ruta of posiblesRutas
    ) {
      const rutaFinal =
        this.normalizarTexto(ruta);

      if (
        rutaFinal &&
        fs.existsSync(rutaFinal)
      ) {
        return path.resolve(
          rutaFinal
        );
      }
    }

    /*
     * Rutas de respaldo comunes.
     * Si DemoFlow guarda los proyectos en otra
     * carpeta, puede agregarse aquí.
     */
    const slug =
      this.normalizarTexto(
        proyecto.slug ||
        proyecto.nombreSlug ||
        proyecto.nombre
      );

    const candidatos = [
      slug
        ? path.join(
            process.cwd(),
            'storage',
            'proyectos',
            slug
          )
        : null,

      slug
        ? path.join(
            process.cwd(),
            'uploads',
            'proyectos',
            slug
          )
        : null,

      slug
        ? path.join(
            process.cwd(),
            '.tmp',
            'proyectos',
            slug
          )
        : null,

      proyecto.id
        ? path.join(
            process.cwd(),
            'storage',
            'proyectos',
            String(proyecto.id)
          )
        : null
    ];

    for (
      const candidato of candidatos
    ) {
      if (
        candidato &&
        fs.existsSync(candidato)
      ) {
        return path.resolve(
          candidato
        );
      }
    }

    return null;
  },

  construirContextoProyecto:
  function (proyecto) {
    if (!proyecto) {
      return '';
    }

    return [
      `Nombre: ${
        this.normalizarTexto(
          proyecto.nombre
        ) || 'Sin nombre'
      }`,

      `Tipo: ${
        this.normalizarTexto(
          proyecto.tipoProyecto ||
          proyecto.tipo
        ) || 'No definido'
      }`,

      `Tecnología: ${
        this.normalizarTexto(
          proyecto.tecnologia
        ) || 'No definida'
      }`,

      `Descripción: ${
        this.normalizarTexto(
          proyecto.descripcion
        ) || 'Sin descripción'
      }`,

      `Repositorio: ${
        this.normalizarTexto(
          proyecto.urlRepositorio ||
          proyecto.repositorio
        ) || 'No suministrado'
      }`,

      `Demo: ${
        this.normalizarTexto(
          proyecto.urlDemo ||
          proyecto.url
        ) || 'No suministrada'
      }`
    ].join('\n');
  },

  responderErrorJson:
  function (
    res,
    error,
    status = 500
  ) {
    return res
      .status(status)
      .json({
        ok: false,
        codigo:
          error &&
          error.code
            ? error.code
            : null,
        mensaje:
          this.obtenerMensajePublicoError(
            error
          )
      });
  },

  // =========================================
  // ANÁLISIS LOCAL GRATUITO DEL FORMULARIO
  // =========================================

  analizarProyecto:
  async function (req, res) {
    try {
      const {
        nombre,
        tipoProyecto,
        tecnologia,
        urlRepositorio,
        urlDemo,
        archivoEntrada,
        comandoInicio
      } = req.body;

      const texto = `
        ${nombre || ''}
        ${tipoProyecto || ''}
        ${tecnologia || ''}
        ${urlRepositorio || ''}
        ${urlDemo || ''}
        ${archivoEntrada || ''}
        ${comandoInicio || ''}
      `.toLowerCase();

      let tipoDetectado =
        'externo';

      let comandoRecomendado =
        '';

      let archivoRecomendado =
        '';

      let mensaje =
        '🤖 IA DemoFlow: Proyecto analizado correctamente.';

      if (
        texto.includes('sails') ||
        texto.includes(
          'config/routes'
        ) ||
        texto.includes(
          'sails lift'
        )
      ) {
        tipoDetectado =
          'sails';

        comandoRecomendado =
          'node app.js';

        archivoRecomendado =
          'app.js';

        mensaje =
          '🤖 IA DemoFlow: Detecté un proyecto Sails.js. Recomiendo iniciar con node app.js.';
      } else if (
        texto.includes('next') ||
        texto.includes('next.js')
      ) {
        tipoDetectado =
          'node';

        comandoRecomendado =
          'npm run start';

        archivoRecomendado =
          'package.json';

        mensaje =
          '🤖 IA DemoFlow: Detecté un proyecto Next.js.';
      } else if (
        texto.includes('react') ||
        texto.includes('vite')
      ) {
        tipoDetectado =
          'node';

        comandoRecomendado =
          'npm run build';

        archivoRecomendado =
          'package.json';

        mensaje =
          '🤖 IA DemoFlow: Detecté un proyecto React/Vite.';
      } else if (
        texto.includes('express') ||
        texto.includes('server.js')
      ) {
        tipoDetectado =
          'node';

        comandoRecomendado =
          'node server.js';

        archivoRecomendado =
          'server.js';

        mensaje =
          '🤖 IA DemoFlow: Detecté un proyecto Node.js / Express.';
      } else if (
        texto.includes('app.js') ||
        texto.includes('node')
      ) {
        tipoDetectado =
          'node';

        comandoRecomendado =
          'node app.js';

        archivoRecomendado =
          'app.js';

        mensaje =
          '🤖 IA DemoFlow: Detecté un proyecto Node.js.';
      } else if (
        texto.includes('index.html') ||
        texto.includes('html')
      ) {
        tipoDetectado =
          'html';

        comandoRecomendado =
          '';

        archivoRecomendado =
          'index.html';

        mensaje =
          '🤖 IA DemoFlow: Detecté una demo HTML estática.';
      } else if (urlDemo) {
        tipoDetectado =
          'externo';

        comandoRecomendado =
          '';

        archivoRecomendado =
          '';

        mensaje =
          '🤖 IA DemoFlow: Detecté una demostración externa por URL.';
      }

      return res.json({
        ok: true,
        ia: false,
        analisisLocal: true,
        consumeDiamantes: false,
        tipoDetectado,
        comandoRecomendado,
        archivoRecomendado,
        mensaje
      });
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error en análisis local del formulario.',
        {
          mensaje:
            error.message,
          stack:
            error.stack
        }
      );

      return res
        .status(500)
        .json({
          ok: false,
          mensaje:
            'DemoFlow no pudo analizar el proyecto.'
        });
    }
  },

  // =========================================
  // DESCRIPCIÓN LOCAL GRATUITA
  // =========================================

  sugerirDescripcion:
  async function (req, res) {
    try {
      const {
        nombre,
        tipoProyecto,
        tecnologia
      } = req.body;

      const tecnologiaFinal =
        this.normalizarTexto(
          tecnologia
        );

      let descripcion =
        `Proyecto ${
          nombre || 'web'
        } desarrollado con ${
          tecnologiaFinal ||
          'tecnologías web'
        }, preparado para mostrarse como demo en vivo dentro de DemoFlow.`;

      const tecnologiaLower =
        tecnologiaFinal
          .toLowerCase();

      if (
        tecnologiaLower.includes(
          'sails'
        )
      ) {
        descripcion =
          'Aplicación web desarrollada en Sails.js y Node.js, preparada para ejecutarse como demo dinámica en DemoFlow con despliegue automático, runtime independiente y URL pública.';
      } else if (
        tecnologiaLower.includes(
          'react'
        )
      ) {
        descripcion =
          'Aplicación frontend desarrollada con React, preparada para publicarse en DemoFlow como una demostración moderna, rápida y adaptable a dispositivos móviles.';
      } else if (
        tecnologiaLower.includes(
          'html'
        )
      ) {
        descripcion =
          'Demo frontend desarrollada con HTML, CSS y JavaScript, optimizada para publicarse rápidamente en DemoFlow como proyecto estático responsive.';
      } else if (
        tecnologiaLower.includes(
          'node'
        ) ||
        tecnologiaLower.includes(
          'express'
        )
      ) {
        descripcion =
          'Aplicación desarrollada con Node.js, preparada para ejecutarse en DemoFlow mediante un runtime independiente y una URL pública para demostraciones en vivo.';
      }

      return res.json({
        ok: true,
        ia: false,
        analisisLocal: true,
        consumeDiamantes: false,
        descripcion
      });
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error sugiriendo descripción local.',
        {
          mensaje:
            error.message
        }
      );

      return res
        .status(500)
        .json({
          ok: false,
          descripcion: ''
        });
    }
  },

  // =========================================
  // DASHBOARD LOCAL GRATUITO
  // =========================================

  analizarDashboard:
  async function (req, res) {
    try {
      const usuario =
        await this.buscarUsuarioActual(
          req
        );

      if (!usuario) {
        return res.redirect(
          '/login'
        );
      }

      const proyectos =
        await Proyecto.find({
          usuario:
            usuario.id
        });

      const totalProyectos =
        proyectos.length;

      const demosConUrl =
        proyectos.filter(
          (proyecto) =>
            Boolean(
              proyecto.urlDemo ||
              proyecto.url
            )
        ).length;

      const proyectosSails =
        proyectos.filter(
          (proyecto) =>
            this.normalizarTexto(
              proyecto.tipoProyecto ||
              proyecto.tipo
            ).toLowerCase() ===
            'sails'
        ).length;

      const proyectosHtml =
        proyectos.filter(
          (proyecto) =>
            this.normalizarTexto(
              proyecto.tipoProyecto ||
              proyecto.tipo
            ).toLowerCase() ===
            'html'
        ).length;

      const proyectosNode =
        proyectos.filter(
          (proyecto) => {
            const tipo =
              this.normalizarTexto(
                proyecto.tipoProyecto ||
                proyecto.tipo
              ).toLowerCase();

            return (
              tipo === 'node' ||
              tipo === 'nodejs' ||
              tipo === 'express'
            );
          }
        ).length;

      let recomendacion =
        'Agrega más demos en vivo, capturas y descripciones comerciales para aumentar conversiones.';

      let potencial =
        'Tu perfil tiene potencial SaaS comercial.';

      let estado =
        'Análisis local de DemoFlow activo.';

      if (
        totalProyectos === 0
      ) {
        recomendacion =
          'Crea tu primer proyecto demo para que DemoFlow pueda analizar tu portafolio.';

        potencial =
          'Aún falta información para calcular el potencial comercial.';
      } else if (
        demosConUrl >= 3
      ) {
        recomendacion =
          'Tu portafolio ya tiene varias demos visibles. El siguiente paso es mejorar textos de venta y llamados a la acción.';

        potencial =
          'Alto potencial comercial para vender servicios o productos SaaS.';
      }

      /*
       * Este análisis es local y gratuito.
       * No registra créditos utilizados porque
       * no realiza llamadas a OpenAI.
       */

      return res.view(
        'pages/dashboard/index',
        {
          usuario,
          proyectos,

          iaDashboard: {
            estado,
            recomendacion,
            potencial,
            totalProyectos,
            demosConUrl,
            proyectosSails,
            proyectosHtml,
            proyectosNode,

            analisisLocal:
              true,

            consumeDiamantes:
              false
          }
        }
      );
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error analizando dashboard local.',
        {
          mensaje:
            error.message,
          stack:
            error.stack
        }
      );

      return res.serverError(
        error
      );
    }
  },

  // =========================================
  // ANÁLISIS AVANZADO DE PROYECTO
  // OPENAI + 2 DIAMANTES
  // =========================================

  analizarProyectoIA:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const proyectoId =
        this.obtenerProyectoId(
          req
        );

      if (!proyectoId) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Proyecto requerido.'
          });
      }

      const proyecto =
        await this
          .buscarProyectoUsuario(
            proyectoId,
            usuarioId
          );

      if (!proyecto) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              'Proyecto no encontrado.'
          });
      }

      const rutaProyecto =
        this.obtenerRutaProyecto(
          proyecto
        );

      if (!rutaProyecto) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'DemoFlow no encontró los archivos locales del proyecto. Las demos externas todavía no pueden analizarse desde archivos.'
          });
      }

      const resultado =
        await IAAnalyzerService
          .analizarProyecto(
            rutaProyecto,
            {
              usarIA: true,
              usuarioId,
              proyectoId:
                proyecto.id
            }
          );

      if (
        !resultado.ia ||
        resultado.ia.disponible !==
          true
      ) {
        const error = new Error(
          resultado.ia &&
          resultado.ia.error
            ? resultado.ia.error
            : 'No fue posible realizar el análisis avanzado.'
        );

        error.code =
          resultado.ia &&
          resultado.ia.codigo
            ? resultado.ia.codigo
            : 'IA_ANALISIS_NO_DISPONIBLE';

        throw error;
      }

      return res.json({
        ok: true,
        proyecto: {
          id:
            proyecto.id,
          nombre:
            proyecto.nombre ||
            proyecto.slug ||
            `Proyecto ${proyecto.id}`
        },

        analisis: resultado,

        ia:
          resultado.ia,

        mensaje:
          'Proyecto analizado correctamente con DemoFlow IA.'
      });
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error analizando proyecto con IA.',
        {
          usuario:
            this.obtenerUsuarioSesion(
              req
            ),
          proyecto:
            this.obtenerProyectoId(
              req
            ),
          codigo:
            error.code ||
            null,
          mensaje:
            error.message
        }
      );

      const status =
        error.code ===
        'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500;

      return this.responderErrorJson(
        res,
        error,
        status
      );
    }
  },

  // =========================================
  // DESCRIPCIÓN AVANZADA
  // OPENAI + 1 DIAMANTE
  // =========================================

  sugerirDescripcionIA:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const proyectoId =
        this.obtenerProyectoId(
          req
        );

      let proyecto = null;

      if (proyectoId) {
        proyecto =
          await this
            .buscarProyectoUsuario(
              proyectoId,
              usuarioId
            );

        if (!proyecto) {
          return res
            .status(404)
            .json({
              ok: false,
              mensaje:
                'Proyecto no encontrado.'
            });
        }
      }

      const nombre =
        this.normalizarTexto(
          req.body.nombre ||
          (
            proyecto
              ? proyecto.nombre
              : ''
          )
        );

      const tipoProyecto =
        this.normalizarTexto(
          req.body.tipoProyecto ||
          (
            proyecto
              ? (
                  proyecto.tipoProyecto ||
                  proyecto.tipo
                )
              : ''
          )
        );

      const tecnologia =
        this.normalizarTexto(
          req.body.tecnologia ||
          (
            proyecto
              ? proyecto.tecnologia
              : ''
          )
        );

      const datosProyecto = [
        `Nombre: ${
          nombre ||
          'Proyecto DemoFlow'
        }`,
        `Tipo: ${
          tipoProyecto ||
          'No especificado'
        }`,
        `Tecnología: ${
          tecnologia ||
          'No especificada'
        }`,
        proyecto
          ? this
              .construirContextoProyecto(
                proyecto
              )
          : ''
      ].filter(Boolean).join('\n');

      const resultado =
        await DemoFlowIAService
          .ejecutar({
            usuarioId,
            proyectoId:
              proyecto
                ? proyecto.id
                : null,

            herramienta: 'chat',

            contexto:
              'Genera una descripción comercial breve para una demo publicada en DemoFlowApp.',

            entrada: `
Genera una descripción profesional y comercial para el siguiente proyecto.

Reglas:

1. Entre 50 y 100 palabras.
2. Explica claramente qué hace.
3. Destaca su valor para clientes.
4. No inventes funciones no suministradas.
5. No uses títulos ni listas.
6. Devuelve únicamente la descripción final.

DATOS:
${datosProyecto}
            `.trim(),

            maxOutputTokens: 350
          });

      return res.json({
        ok: true,
        descripcion:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia,
        mensaje:
          'Descripción generada correctamente.'
      });
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error generando descripción avanzada.',
        {
          codigo:
            error.code ||
            null,
          mensaje:
            error.message
        }
      );

      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
  // DASHBOARD AVANZADO
  // OPENAI + 2 DIAMANTES
  // =========================================

  analizarDashboardIA:
  async function (req, res) {
    try {
      const usuario =
        await this.buscarUsuarioActual(
          req
        );

      if (!usuario) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const proyectos =
        await Proyecto.find({
          usuario:
            usuario.id
        });

      const resumenProyectos =
        proyectos
          .slice(0, 50)
          .map(
            (proyecto, indice) => {
              return [
                `${indice + 1}. ${
                  proyecto.nombre ||
                  proyecto.slug ||
                  `Proyecto ${proyecto.id}`
                }`,
                `Tipo: ${
                  proyecto.tipoProyecto ||
                  proyecto.tipo ||
                  'No definido'
                }`,
                `Tecnología: ${
                  proyecto.tecnologia ||
                  'No definida'
                }`,
                `Demo: ${
                  proyecto.urlDemo ||
                  proyecto.url ||
                  'Sin URL'
                }`,
                `Estado: ${
                  proyecto.estado ||
                  proyecto.status ||
                  'No definido'
                }`
              ].join(' | ');
            }
          )
          .join('\n');

      const resultado =
        await DemoFlowIAService
          .ejecutar({
            usuarioId:
              usuario.id,

            herramienta:
              'analizar_potencial_comercial',

            contexto:
              'Analiza el portafolio completo del usuario dentro de DemoFlowApp.',

            entrada: `
Analiza el siguiente portafolio de proyectos.

Entrega:

1. Estado general del portafolio.
2. Tecnologías predominantes.
3. Fortalezas.
4. Debilidades.
5. Proyectos con mayor potencial comercial.
6. Recomendaciones para conseguir clientes.
7. Recomendaciones para mejorar las demos.
8. Prioridades para los próximos 30 días.

USUARIO:
Nombre: ${usuario.nombre || 'Usuario DemoFlow'}
Plan: ${usuario.plan || 'Sin plan'}
Premium: ${usuario.premium === true}
Diamantes: ${Number(usuario.creditos || 0)}

TOTAL DE PROYECTOS:
${proyectos.length}

PROYECTOS:
${resumenProyectos || 'El usuario todavía no tiene proyectos.'}
            `.trim()
          });

      return res.json({
        ok: true,
        analisis:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia,
        totalProyectos:
          proyectos.length,
        mensaje:
          'Dashboard analizado con DemoFlow IA.'
      });
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error analizando dashboard avanzado.',
        {
          codigo:
            error.code ||
            null,
          mensaje:
            error.message
        }
      );

      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
// CHAT DEMOFLOW IA
// OPENAI + 1 DIAMANTE
// =========================================

chat: async function (req, res) {
  try {
    const usuarioId =
      req &&
      req.session &&
      req.session.userId
        ? Number(req.session.userId)
        : null;

    if (
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          mensaje:
            'Debes iniciar sesión.'
        });
    }

    const mensaje =
      String(
        req.body &&
        (
          req.body.mensaje ||
          req.body.prompt ||
          req.body.pregunta
        )
          ? (
              req.body.mensaje ||
              req.body.prompt ||
              req.body.pregunta
            )
          : ''
      ).trim();

    if (!mensaje) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            'Escribe una pregunta para DemoFlow IA.'
        });
    }

    const valorProyecto =
      (
        req.params &&
        req.params.id
      ) ||
      (
        req.body &&
        (
          req.body.proyectoId ||
          req.body.proyecto
        )
      ) ||
      (
        req.query &&
        (
          req.query.proyectoId ||
          req.query.proyecto
        )
      ) ||
      null;

    const proyectoId =
      valorProyecto
        ? Number(valorProyecto)
        : null;

    let proyecto = null;

    if (
      Number.isSafeInteger(proyectoId) &&
      proyectoId > 0
    ) {
      proyecto =
        await Proyecto.findOne({
          id: proyectoId,
          usuario: usuarioId
        });

      if (!proyecto) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              'Proyecto no encontrado.'
          });
      }
    }

    let contexto =
      'Consulta general dentro de DemoFlowApp.';

    if (proyecto) {
      contexto = [
        `Nombre: ${
          proyecto.nombre ||
          proyecto.slug ||
          'Sin nombre'
        }`,

        `Tipo: ${
          proyecto.tipoProyecto ||
          proyecto.tipo ||
          'No definido'
        }`,

        `Tecnología: ${
          proyecto.tecnologia ||
          'No definida'
        }`,

        `Descripción: ${
          proyecto.descripcion ||
          'Sin descripción'
        }`,

        `Repositorio: ${
          proyecto.urlRepositorio ||
          proyecto.repositorio ||
          'No suministrado'
        }`,

        `Demo: ${
          proyecto.urlDemo ||
          proyecto.url ||
          'No suministrada'
        }`
      ].join('\n');
    }

    const resultado =
      await DemoFlowIAService.chat({
        usuarioId,
        mensaje,

        proyectoId:
          proyecto
            ? proyecto.id
            : null,

        contexto
      });

    return res.json({
      ok: true,

      respuesta:
        resultado.respuesta ||
        resultado.texto ||
        '',

      costo:
        Number(
          resultado.costo || 0
        ),

      saldo:
        typeof resultado.saldo !==
          'undefined'
          ? resultado.saldo
          : null,

      referencia:
        resultado.referencia ||
        null,

      modelo:
        resultado.modelo ||
        null
    });
  } catch (error) {
    sails.log.error(
      '❌ IA DemoFlow: Error en chat.',
      {
        codigo:
          error.code ||
          null,

        mensaje:
          error.message,

        stack:
          error.stack
      }
    );

    let status = 500;

    if (
      error.code ===
      'IA_CREDITOS_INSUFICIENTES'
    ) {
      status = 402;
    } else if (
      error.code ===
      'IA_SIN_ACCESO'
    ) {
      status = 403;
    } else if (
      error.code ===
      'OPENAI_TIMEOUT'
    ) {
      status = 504;
    }

    let mensajePublico =
      error.message ||
      'DemoFlow IA no pudo completar la solicitud.';

    if (
      error.code ===
      'IA_CREDITOS_INSUFICIENTES'
    ) {
      mensajePublico =
        'No tienes suficientes diamantes para usar esta herramienta.';
    }

    if (
      error.code ===
      'IA_SIN_ACCESO'
    ) {
      mensajePublico =
        'No tienes acceso a DemoFlow IA. Activa un plan Premium.';
    }

    if (
      error.code ===
      'OPENAI_API_KEY_MISSING'
    ) {
      mensajePublico =
        'DemoFlow IA todavía no tiene configurada la clave de OpenAI.';
    }

    if (
      error.code ===
      'OPENAI_TIMEOUT'
    ) {
      mensajePublico =
        'DemoFlow IA tardó demasiado en responder. Intenta nuevamente.';
    }

    return res
      .status(status)
      .json({
        ok: false,

        codigo:
          error.code ||
          null,

        mensaje:
          mensajePublico
      });
  }
},

  // =========================================
// EXPLICAR ERROR
// OPENAI + 1 DIAMANTE
// =========================================

explicarError: async function (req, res) {
  try {
    const usuarioId =
      req &&
      req.session &&
      req.session.userId
        ? Number(req.session.userId)
        : null;

    if (
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          mensaje:
            'Debes iniciar sesión.'
        });
    }

    const mensajeError =
      String(
        req.body &&
        (
          req.body.error ||
          req.body.mensaje
        )
          ? (
              req.body.error ||
              req.body.mensaje
            )
          : ''
      ).trim();

    const codigo =
      String(
        req.body &&
        (
          req.body.codigo ||
          req.body.log
        )
          ? (
              req.body.codigo ||
              req.body.log
            )
          : ''
      ).trim();

    if (!mensajeError) {
      return res
        .status(400)
        .json({
          ok: false,
          mensaje:
            'Debes enviar el error que deseas analizar.'
        });
    }

    const valorProyecto =
      (
        req.params &&
        req.params.id
      ) ||
      (
        req.body &&
        (
          req.body.proyectoId ||
          req.body.proyecto
        )
      ) ||
      (
        req.query &&
        (
          req.query.proyectoId ||
          req.query.proyecto
        )
      ) ||
      null;

    const proyectoId =
      valorProyecto
        ? Number(valorProyecto)
        : null;

    let proyecto = null;

    if (
      Number.isSafeInteger(proyectoId) &&
      proyectoId > 0
    ) {
      proyecto =
        await Proyecto.findOne({
          id: proyectoId,
          usuario: usuarioId
        });

      if (!proyecto) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              'Proyecto no encontrado.'
          });
      }
    }

    let contexto = '';

    if (proyecto) {
      contexto = [
        `Nombre: ${
          proyecto.nombre ||
          proyecto.slug ||
          'Sin nombre'
        }`,

        `Tipo: ${
          proyecto.tipoProyecto ||
          proyecto.tipo ||
          'No definido'
        }`,

        `Tecnología: ${
          proyecto.tecnologia ||
          'No definida'
        }`,

        `Descripción: ${
          proyecto.descripcion ||
          'Sin descripción'
        }`,

        `Repositorio: ${
          proyecto.urlRepositorio ||
          proyecto.repositorio ||
          'No suministrado'
        }`,

        `Demo: ${
          proyecto.urlDemo ||
          proyecto.url ||
          'No suministrada'
        }`
      ].join('\n');
    }

    const resultado =
      await DemoFlowIAService
        .explicarError({
          usuarioId,

          error:
            mensajeError,

          codigo,

          proyectoId:
            proyecto
              ? proyecto.id
              : null,

          contexto
        });

    return res.json({
      ok: true,

      respuesta:
        resultado.respuesta ||
        resultado.texto ||
        '',

      costo:
        Number(
          resultado.costo || 0
        ),

      saldo:
        typeof resultado.saldo !==
          'undefined'
          ? resultado.saldo
          : null,

      referencia:
        resultado.referencia ||
        null,

      modelo:
        resultado.modelo ||
        null
    });
  } catch (error) {
    sails.log.error(
      '❌ IA DemoFlow: Error explicando error.',
      {
        codigo:
          error.code ||
          null,

        mensaje:
          error.message,

        stack:
          error.stack
      }
    );

    let status = 500;

    if (
      error.code ===
      'IA_CREDITOS_INSUFICIENTES'
    ) {
      status = 402;
    } else if (
      error.code ===
      'IA_SIN_ACCESO'
    ) {
      status = 403;
    } else if (
      error.code ===
      'OPENAI_TIMEOUT'
    ) {
      status = 504;
    }

    let mensajePublico =
      error.message ||
      'DemoFlow IA no pudo analizar el error.';

    if (
      error.code ===
      'IA_CREDITOS_INSUFICIENTES'
    ) {
      mensajePublico =
        'No tienes suficientes diamantes para usar esta herramienta.';
    }

    if (
      error.code ===
      'IA_SIN_ACCESO'
    ) {
      mensajePublico =
        'No tienes acceso a DemoFlow IA. Activa un plan Premium.';
    }

    if (
      error.code ===
      'OPENAI_API_KEY_MISSING'
    ) {
      mensajePublico =
        'DemoFlow IA todavía no tiene configurada la clave de OpenAI.';
    }

    if (
      error.code ===
      'OPENAI_TIMEOUT'
    ) {
      mensajePublico =
        'DemoFlow IA tardó demasiado en responder. Intenta nuevamente.';
    }

    return res
      .status(status)
      .json({
        ok: false,

        codigo:
          error.code ||
          null,

        mensaje:
          mensajePublico
      });
  }
},

  // =========================================
  // GENERAR README
  // OPENAI + 2 DIAMANTES
  // =========================================

  generarReadme:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const proyectoId =
        this.obtenerProyectoId(
          req
        );

      if (!proyectoId) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Proyecto requerido.'
          });
      }

      const proyecto =
        await this
          .buscarProyectoUsuario(
            proyectoId,
            usuarioId
          );

      if (!proyecto) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              'Proyecto no encontrado.'
          });
      }

      const resultado =
        await DemoFlowIAService
          .generarReadme({
            usuarioId,
            proyectoId:
              proyecto.id,
            nombreProyecto:
              proyecto.nombre ||
              proyecto.slug ||
              'Proyecto DemoFlow',
            contenido:
              this
                .construirContextoProyecto(
                  proyecto
                ),
            contexto:
              'El README será utilizado para presentar el proyecto dentro de DemoFlowApp y GitHub.'
          });

      return res.json({
        ok: true,
        readme:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
  // REVISAR SEGURIDAD
  // OPENAI + 3 DIAMANTES
  // =========================================

  revisarSeguridad:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const contenido =
        this.normalizarTexto(
          req.body.contenido ||
          req.body.codigo
        );

      if (!contenido) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Debes enviar código o información del proyecto.'
          });
      }

      const proyectoId =
        this.obtenerProyectoId(
          req
        );

      const resultado =
        await DemoFlowIAService
          .revisarSeguridad({
            usuarioId,
            proyectoId,
            contenido,
            contexto:
              'Revisión defensiva de seguridad para un proyecto alojado en DemoFlowApp.'
          });

      return res.json({
        ok: true,
        respuesta:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
  // ANALIZAR SEO
  // OPENAI + 3 DIAMANTES
  // =========================================

  analizarSEO:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const contenido =
        this.normalizarTexto(
          req.body.contenido ||
          req.body.html ||
          req.body.descripcion
        );

      const url =
        this.normalizarTexto(
          req.body.url ||
          req.body.urlDemo
        );

      if (
        !contenido &&
        !url
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Debes enviar contenido o una URL para analizar.'
          });
      }

      const resultado =
        await DemoFlowIAService
          .analizarSEO({
            usuarioId,
            proyectoId:
              this.obtenerProyectoId(
                req
              ),
            contenido:
              contenido ||
              `Analiza la información disponible para la URL: ${url}`,
            url,
            contexto:
              'Análisis SEO para una demo publicada dentro de DemoFlowApp.'
          });

      return res.json({
        ok: true,
        respuesta:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
  // POTENCIAL COMERCIAL
  // OPENAI + 3 DIAMANTES
  // =========================================

  analizarPotencialComercial:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const proyectoId =
        this.obtenerProyectoId(
          req
        );

      if (!proyectoId) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Proyecto requerido.'
          });
      }

      const proyecto =
        await this
          .buscarProyectoUsuario(
            proyectoId,
            usuarioId
          );

      if (!proyecto) {
        return res
          .status(404)
          .json({
            ok: false,
            mensaje:
              'Proyecto no encontrado.'
          });
      }

      const resultado =
        await DemoFlowIAService
          .analizarPotencialComercial({
            usuarioId,
            proyectoId:
              proyecto.id,
            contenido:
              this
                .construirContextoProyecto(
                  proyecto
                ),
            contexto:
              'Determina el potencial de venta de una aplicación presentada como demo en DemoFlowApp.'
          });

      return res.json({
        ok: true,
        respuesta:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

  // =========================================
  // ANALIZAR ARQUITECTURA
  // OPENAI + 5 DIAMANTES
  // =========================================

  analizarArquitectura:
  async function (req, res) {
    try {
      const usuarioId =
        this.obtenerUsuarioSesion(
          req
        );

      if (!usuarioId) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const contenido =
        this.normalizarTexto(
          req.body.contenido ||
          req.body.codigo ||
          req.body.estructura
        );

      if (!contenido) {
        return res
          .status(400)
          .json({
            ok: false,
            mensaje:
              'Debes enviar información de la arquitectura.'
          });
      }

      const resultado =
        await DemoFlowIAService
          .analizarArquitectura({
            usuarioId,
            proyectoId:
              this.obtenerProyectoId(
                req
              ),
            contenido,
            contexto:
              'Analiza la arquitectura de una aplicación publicada o preparada para DemoFlowApp.'
          });

      return res.json({
        ok: true,
        respuesta:
          resultado.respuesta ||
          resultado.texto,
        costo:
          resultado.costo,
        saldo:
          resultado.saldo,
        referencia:
          resultado.referencia
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        error.code ===
          'IA_CREDITOS_INSUFICIENTES'
          ? 402
          : 500
      );
    }
  },

// =========================================
// CENTRO DEMOFLOW IA
// =========================================

centro: async function (req, res) {
  try {
    const usuarioId =
      req &&
      req.session &&
      req.session.userId
        ? Number(req.session.userId)
        : null;

    if (
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      return res.redirect('/login');
    }

    const usuario =
      await Usuario.findOne({
        id: usuarioId
      });

    if (!usuario) {
      return res.redirect('/login');
    }

    const proyectos =
      await Proyecto.find({
        usuario: usuario.id
      });

    return res.view(
      'pages/ia/centro',
      {
        titulo:
          'Centro DemoFlow IA',

        usuario,

        proyectos
      }
    );
  } catch (error) {
    sails.log.error(
      '❌ IA DemoFlow: Error cargando el Centro IA.',
      {
        mensaje:
          error.message,
        stack:
          error.stack
      }
    );

    return res.serverError(
      'No fue posible cargar el Centro DemoFlow IA.'
    );
  }
},

  // =========================================
  // ESTADO DE DEMOFLOW IA
  // =========================================

  estado:
  async function (req, res) {
    try {
      const usuario =
        await this.buscarUsuarioActual(
          req
        );

      if (!usuario) {
        return res
          .status(401)
          .json({
            ok: false,
            mensaje:
              'Debes iniciar sesión.'
          });
      }

      const estadoServicio =
        DemoFlowIAService.estado();

      return res.json({
        ok: true,

        servicio:
          estadoServicio,

        usuario: {
          id:
            usuario.id,
          nombre:
            usuario.nombre ||
            null,
          plan:
            usuario.plan ||
            null,
          premium:
            usuario.premium ===
            true,
          accesoIA:
            usuario.accesoIA ===
              true ||
            usuario.acceso_ia ===
              true ||
            usuario.premium ===
              true ||
            usuario.esPremium ===
              true,
          diamantes:
            Math.max(
              0,
              Number(
                usuario.creditos ||
                0
              )
            )
        }
      });
    } catch (error) {
      return this.responderErrorJson(
        res,
        error,
        500
      );
    }
  }

};