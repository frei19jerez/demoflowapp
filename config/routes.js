module.exports.routes = {
  'GET /': 'ProyectoController.index',
  'GET /nuevo': 'ProyectoController.nuevo',
  'POST /crear': 'ProyectoController.crear',
  'GET /proyecto/:id': 'ProyectoController.ver',

  'GET /register': 'AuthController.registerPage',
'POST /register': 'AuthController.register',

'GET /login': 'AuthController.loginPage',
'POST /login': 'AuthController.login',

'GET /logout': 'AuthController.logout',

'GET /dashboard': async function(req, res) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const proyectos = await Proyecto.find({
    usuarioId: req.session.userId
  }).sort('id DESC');

  return res.view('pages/dashboard/index', {
    titulo: 'Dashboard',
    proyectos,
    usuario: {
      id: req.session.userId,
      nombre: req.session.userName,
      email: req.session.userEmail
    }
  });
},
};