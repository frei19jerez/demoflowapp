/**
 * Route Mappings
 * (sails.config.routes)
 */

'use strict';

module.exports.routes = {

  // ======================================================
  // HOME
  // ======================================================

  'GET /': {
    controller: 'ProyectoController',
    action: 'index'
  },

  // ======================================================
  // PROYECTOS
  // ======================================================

  'GET /proyecto/nuevo': {
    controller: 'ProyectoController',
    action: 'nuevo'
  },

  'POST /proyecto/crear': {
    controller: 'ProyectoController',
    action: 'crear'
  },

  'GET /proyecto/:id': {
    controller: 'ProyectoController',
    action: 'ver'
  },

  /**
   * Ruta antigua de análisis del proyecto.
   *
   * Por ahora continúa conectada con
   * ProyectoController.analizarIA para no romper
   * los botones o vistas que ya la utilizan.
   */
  'POST /proyecto/:id/analizar-ia': {
    controller: 'ProyectoController',
    action: 'analizarIA'
  },

  'POST /proyecto/:id/eliminar': {
    controller: 'ProyectoController',
    action: 'eliminar'
  },

  'GET /proyecto/:id/eliminar': {
    controller: 'ProyectoController',
    action: 'eliminar'
  },

  'POST /proyecto/:id/reemplazar-archivos': {
    controller: 'ProyectoController',
    action: 'reemplazarArchivos'
  },

  'POST /proyecto/:id/actualizar-git': {
    controller: 'ProyectoController',
    action: 'actualizarGit'
  },

  // ======================================================
  // DEPLOY
  // ======================================================

  'GET /deploy/lista': {
    controller: 'ProyectoController',
    action: 'listaDeploys'
  },

  'GET /deploy/estado/:id': {
    controller: 'ProyectoController',
    action: 'estadoDeploy'
  },

  'GET /deploy/:id': {
    controller: 'DeployController',
    action: 'estado'
  },

  'GET /deploy/:id/logs': {
    controller: 'DeployController',
    action: 'logs'
  },

  'GET /deploy/:id/desplegar': {
    controller: 'DeployController',
    action: 'desplegar'
  },

  'GET /deploy/:id/detener': {
    controller: 'DeployController',
    action: 'detener'
  },

  'GET /deploy/:id/reiniciar': {
    controller: 'DeployController',
    action: 'reiniciar'
  },

  'GET /deploy/:id/log-json': {
    controller: 'DeployController',
    action: 'logJson'
  },

  // ======================================================
  // DEMOS
  // ======================================================

  'GET /demo/:slug': {
    controller: 'DemoController',
    action: 'ver'
  },

  'GET /demo-check/:slug': {
    controller: 'DemoController',
    action: 'check'
  },

  // ======================================================
  // AUTENTICACIÓN DE USUARIOS
  // ======================================================

  'GET /register': {
    controller: 'AuthController',
    action: 'registerPage'
  },

  'POST /register': {
    controller: 'AuthController',
    action: 'register'
  },

  'GET /login': {
    controller: 'AuthController',
    action: 'loginPage'
  },

  'POST /login': {
    controller: 'AuthController',
    action: 'login'
  },

  'GET /logout': {
    controller: 'AuthController',
    action: 'logout'
  },

  // ======================================================
  // AUTENTICACIÓN ADMINISTRATIVA
  // ======================================================

  'GET /admin/login': {
    controller: 'AdminController',
    action: 'loginPage'
  },

  'POST /admin/login': {
    controller: 'AdminController',
    action: 'login'
  },

  'GET /admin/register': {
    controller: 'AdminController',
    action: 'registerPage'
  },

  'POST /admin/register': {
    controller: 'AdminController',
    action: 'register'
  },

  'GET /admin/logout': {
    controller: 'AdminController',
    action: 'logout'
  },

  // ======================================================
  // PANEL ADMINISTRATIVO
  // ======================================================

  'GET /admin': {
    controller: 'AdminController',
    action: 'dashboard'
  },

  // ======================================================
  // RUNTIME
  // ======================================================

  'ALL /runtime/:slug': {
    controller: 'RuntimeController',
    action: 'proxy',
    skipAssets: true
  },

  'ALL /runtime/:slug/*': {
    controller: 'RuntimeController',
    action: 'proxy',
    skipAssets: true
  },

  // ======================================================
  // DASHBOARD
  // ======================================================

  'GET /dashboard': {
    controller: 'ProyectoController',
    action: 'dashboard'
  },

  // ======================================================
  // PREMIUM Y PRECIOS
  // ======================================================

  'GET /pricing': {
    controller: 'PremiumController',
    action: 'pricing'
  },

  'GET /premium': {
    controller: 'PremiumController',
    action: 'premium'
  },

  // ======================================================
  // PAGOS
  // ======================================================

  'GET /pagos': {
    controller: 'PagoController',
    action: 'lista'
  },

  'POST /pago/crear': {
    controller: 'PagoController',
    action: 'crear'
  },

  // ======================================================
  // PAYPAL
  //
  // Las rutas específicas deben quedar antes
  // de la ruta general GET /pago/:id.
  // ======================================================

  'GET /pago/paypal/retorno': {
    controller: 'PagoController',
    action: 'retornoPaypal'
  },

  'GET /pago/paypal/cancelar': {
    controller: 'PagoController',
    action: 'cancelarPaypal'
  },

  'GET /pago/:id/paypal': {
    controller: 'PagoController',
    action: 'paypal'
  },

  'POST /webhooks/paypal': {
    controller: 'WebhookController',
    action: 'paypal',
    csrf: false
  },

  // ======================================================
  // WOMPI
  // ======================================================

  'GET /pago/wompi/resultado': {
    controller: 'PagoController',
    action: 'resultadoWompi'
  },

  'GET /pago/:id/wompi': {
    controller: 'PagoController',
    action: 'wompi'
  },

  'POST /webhooks/wompi': {
    controller: 'WebhookController',
    action: 'wompi',
    csrf: false
  },

  // ======================================================
  // ADMINISTRACIÓN DE PAGOS
  //
  // Estas acciones deben protegerse con
  // autenticación y policy administrativa.
  // ======================================================

  'POST /pago/:id/aprobar': {
    controller: 'PagoController',
    action: 'aprobar'
  },

  'POST /pago/:id/rechazar': {
    controller: 'PagoController',
    action: 'rechazar'
  },

  // ======================================================
  // DETALLE GENERAL DEL PAGO
  //
  // Debe permanecer después de PayPal y Wompi.
  // ======================================================

  'GET /pago/:id': {
    controller: 'PagoController',
    action: 'ver'
  },

  // ======================================================
  // DEMOFLOW IA — FUNCIONES LOCALES GRATUITAS
  //
  // Estas funciones no llaman a OpenAI y no
  // consumen diamantes.
  // ======================================================

  'POST /ia/analizar-proyecto': {
    controller: 'IAController',
    action: 'analizarProyecto'
  },

  'POST /ia/sugerir-descripcion': {
    controller: 'IAController',
    action: 'sugerirDescripcion'
  },

  'POST /ia/analizar-dashboard': {
    controller: 'IAController',
    action: 'analizarDashboard'
  },

  // ======================================================
  // DEMOFLOW IA — SERVICIO Y USUARIO
  // ======================================================

  /**
   * Devuelve:
   * - Estado de OpenAI.
   * - Modelo configurado.
   * - Plan del usuario.
   * - Acceso IA.
   * - Saldo de diamantes.
   */
  'GET /ia/estado': {
    controller: 'IAController',
    action: 'estado'
  },

  // ======================================================
  // DEMOFLOW IA — HERRAMIENTAS AVANZADAS
  //
  // Estas rutas llaman a OpenAI, descuentan
  // diamantes y registran historial.
  // ======================================================

  /**
   * Analiza los archivos locales de un proyecto.
   * Costo configurado: 2 diamantes.
   */
  'POST /ia/proyecto/:id/analizar': {
    controller: 'IAController',
    action: 'analizarProyectoIA'
  },

  /**
   * Ruta alternativa compatible con botones
   * asociados directamente al proyecto.
   */
  'POST /proyecto/:id/analizar-demoflow-ia': {
    controller: 'IAController',
    action: 'analizarProyectoIA'
  },

  /**
   * Genera una descripción comercial.
   * Costo configurado: 1 diamante mediante chat.
   */
  'POST /ia/proyecto/:id/descripcion': {
    controller: 'IAController',
    action: 'sugerirDescripcionIA'
  },

  /**
   * También acepta datos de un proyecto que todavía
   * no haya sido guardado.
   */
  'POST /ia/sugerir-descripcion-avanzada': {
    controller: 'IAController',
    action: 'sugerirDescripcionIA'
  },

  /**
   * Analiza el portafolio completo del usuario.
   * Costo configurado: 3 diamantes.
   */
  'POST /ia/dashboard/analizar': {
    controller: 'IAController',
    action: 'analizarDashboardIA'
  },

  /**
   * Chat general o relacionado con un proyecto.
   * Costo configurado: 1 diamante.
   */
  'POST /ia/chat': {
    controller: 'IAController',
    action: 'chat'
  },

  /**
   * Explica errores, logs y fragmentos de código.
   * Costo configurado: 1 diamante.
   */
  'POST /ia/explicar-error': {
    controller: 'IAController',
    action: 'explicarError'
  },

  /**
   * Genera el README de un proyecto.
   * Costo configurado: 2 diamantes.
   */
  'POST /ia/proyecto/:id/readme': {
    controller: 'IAController',
    action: 'generarReadme'
  },

  /**
   * Revisión defensiva de seguridad.
   * Costo configurado: 3 diamantes.
   */
  'POST /ia/revisar-seguridad': {
    controller: 'IAController',
    action: 'revisarSeguridad'
  },

  /**
   * Análisis SEO.
   * Costo configurado: 3 diamantes.
   */
  'POST /ia/analizar-seo': {
    controller: 'IAController',
    action: 'analizarSEO'
  },

  /**
   * Potencial de venta y monetización.
   * Costo configurado: 3 diamantes.
   */
  'POST /ia/proyecto/:id/potencial-comercial': {
    controller: 'IAController',
    action: 'analizarPotencialComercial'
  },

  /**
   * Revisión de arquitectura.
   * Costo configurado: 5 diamantes.
   */
  'POST /ia/analizar-arquitectura': {
    controller: 'IAController',
    action: 'analizarArquitectura'
  },

  'GET /ia/centro': {
  controller: 'IAController',
  action: 'centro'
},

  // ======================================================
  // ANALYTICS
  // ======================================================

  'GET /analytics': async function (req, res) {
    try {
      const totalProyectos =
        await Proyecto.count();

      const demosActivas =
        await Proyecto.count({
          estadoDeploy: 'activo'
        });

      const totalUsuarios =
        await Usuario.count();

      const totalPagos =
        await Pago.count();

      return res.view(
        'pages/analytics',
        {
          titulo:
            'Analytics IA',

          totalProyectos,
          demosActivas,
          totalUsuarios,
          totalPagos,

          usuario:
            req.session &&
            req.session.userId
              ? {
                  id:
                    req.session.userId,

                  nombre:
                    req.session.userName,

                  email:
                    req.session.userEmail
                }
              : null
        }
      );
    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error cargando Analytics.',
        {
          mensaje:
            error.message,

          stack:
            error.stack
        }
      );

      return res.serverError(
        'Error cargando Analytics.'
      );
    }
  }

};