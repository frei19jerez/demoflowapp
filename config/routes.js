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
  'GET /proyecto/nuevo': 'ProyectoController.nuevo',
  'POST /proyecto/crear': 'ProyectoController.crear',
  'GET /proyecto/:id': 'ProyectoController.ver',
  'POST /proyecto/:id/analizar-ia': 'ProyectoController.analizarIA',
  'POST /proyecto/:id/eliminar': 'ProyectoController.eliminar',
  'GET /proyecto/:id/eliminar': 'ProyectoController.eliminar',

  // ===============================
  // DEPLOY
  // ===============================
  'GET /deploy/lista': 'ProyectoController.listaDeploys',
  'GET /deploy/estado/:id': 'ProyectoController.estadoDeploy',
  'GET /deploy/:id': 'DeployController.estado',
  'GET /deploy/:id/logs': 'DeployController.logs',
  'GET /deploy/:id/desplegar': 'DeployController.desplegar',
  'GET /deploy/:id/detener': 'DeployController.detener',
  'GET /deploy/:id/reiniciar': 'DeployController.reiniciar',
  'GET /deploy/:id/log-json': 'DeployController.logJson',

  // ===============================
  // DEMOS HTML
  // ===============================
  'GET /demo/:slug': 'DemoController.ver',
  'GET /demo-check/:slug': 'DemoController.check',

  // ===============================
  // RUNTIME DINÁMICO
  // IMPORTANTE:
  // Estas rutas deben ir antes de login/admin generales
  // para que /runtime/:slug/admin no caiga en DemoFlow.
  // ===============================
  'ALL /runtime/:slug': 'RuntimeController.proxy',
  'ALL /runtime/:slug/*': 'RuntimeController.proxy',

  // ===============================
  // AUTENTICACIÓN USUARIOS
  // ===============================
  'GET /register': 'AuthController.registerPage',
  'POST /register': 'AuthController.register',
  'GET /login': 'AuthController.loginPage',
  'POST /login': 'AuthController.login',
  'GET /logout': 'AuthController.logout',

  // ===============================
  // ADMIN AUTH DEMOFLOW
  // ===============================
  'GET /admin/login': 'AdminController.loginPage',
  'POST /admin/login': 'AdminController.login',
  'GET /admin/register': 'AdminController.registerPage',
  'POST /admin/register': 'AdminController.register',
  'GET /admin/logout': 'AdminController.logout',

  // ===============================
  // ADMIN PANEL DEMOFLOW
  // ===============================
  'GET /admin': 'AdminController.dashboard',

  // ===============================
  // DASHBOARD
  // ===============================
  'GET /dashboard': 'ProyectoController.dashboard',

  // ===============================
  // PREMIUM / PAGOS
  // ===============================
  'GET /pricing': 'PremiumController.pricing',
  'GET /premium': 'PremiumController.premium',
  'POST /pago/crear': 'PagoController.crear',

  // ===============================
  // IA DEMOFLOW
  // ===============================
  'POST /ia/analizar-proyecto': 'IAController.analizarProyecto',
  'POST /ia/sugerir-descripcion': 'IAController.sugerirDescripcion',
  'POST /ia/analizar-dashboard': 'IAController.analizarDashboard',

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