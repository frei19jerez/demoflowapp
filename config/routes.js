module.exports.routes = {

  'GET /': 'ProyectoController.index',

  'GET /proyecto/nuevo': 'ProyectoController.nuevo',
  'POST /proyecto/crear': 'ProyectoController.crear',
  'GET /proyecto/:id': 'ProyectoController.ver',

  'GET /register': 'AuthController.registerPage',
  'POST /register': 'AuthController.register',

  'GET /login': 'AuthController.loginPage',
  'POST /login': 'AuthController.login',

  'GET /logout': 'AuthController.logout',

  'GET /dashboard': 'ProyectoController.dashboard'

};