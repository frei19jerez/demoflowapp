/**
 * Route Mappings
 * (sails.config.routes)
 */

module.exports.routes = {

  // ===============================
  // HOME
  // ===============================
  'GET /': 'ProyectoController.index',

  // ===============================
  // PROYECTOS
  // ===============================
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

  // ===============================
  // DEPLOY
  // ===============================
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

  // ===============================
  // DEMOS
  // ===============================
  'GET /demo/:slug': {
    controller: 'DemoController',
    action: 'ver'
  },

  'GET /demo-check/:slug': {
    controller: 'DemoController',
    action: 'check'
  },

  // ===============================
  // AUTENTICACIÓN USUARIOS
  // ===============================
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

  // ===============================
  // ADMIN AUTH
  // ===============================
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

  // ===============================
  // ADMIN PANEL
  // ===============================
  'GET /admin': {
    controller: 'AdminController',
    action: 'dashboard'
  },

  // ===============================
  // RUNTIME
  // ===============================
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

  // ===============================
  // DASHBOARD
  // ===============================
  'GET /dashboard': {
    controller: 'ProyectoController',
    action: 'dashboard'
  },

  // ===============================
  // PREMIUM / PAGOS
  // ===============================
  'GET /pricing': {
    controller: 'PremiumController',
    action: 'pricing'
  },

  'GET /premium': {
    controller: 'PremiumController',
    action: 'premium'
  },

  'POST /pago/crear': {
    controller: 'PagoController',
    action: 'crear'
  },

  // ===============================
  // IA DEMOFLOW
  // ===============================
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

  'POST /proyecto/:id/actualizar-git':
'ProyectoController.actualizarGit',
  // ===============================
  // ANALYTICS
  // ===============================
  'GET /analytics': async function(req, res) {
    try {
      const totalProyectos = await Proyecto.count();

      const demosActivas = await Proyecto.count({
        estadoDeploy: 'activo'
      });

      const totalUsuarios = await Usuario.count();
      const totalPagos = await Pago.count();

      return res.view('pages/analytics', {
        titulo: 'Analytics IA',
        totalProyectos,
        demosActivas,
        totalUsuarios,
        totalPagos,

        usuario: req.session && req.session.userId ? {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        } : null
      });

    } catch (err) {
      sails.log.error('❌ IA DemoFlow: Error cargando analytics.');
      sails.log.error(err);

      return res.serverError('Error cargando analytics.');
    }
  }

};