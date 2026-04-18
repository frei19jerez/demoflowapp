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