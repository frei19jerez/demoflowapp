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

  // ===============================
  // DEMOS
  // ===============================
  'GET /demo/:slug': 'DemoController.ver',
  'GET /demo-check/:slug': 'DemoController.check',

  // ===============================
  // AUTENTICACIÓN
  // ===============================
  'GET /register': 'AuthController.registerPage',
  'POST /register': 'AuthController.register',

  'GET /login': 'AuthController.loginPage',
  'POST /login': 'AuthController.login',

  'GET /logout': 'AuthController.logout',

  // ===============================
  // DASHBOARD
  // ===============================
  'GET /dashboard': 'ProyectoController.dashboard'

};