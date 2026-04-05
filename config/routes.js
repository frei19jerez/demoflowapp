module.exports.routes = {
  'GET /': 'ProyectoController.index',
  'GET /nuevo': 'ProyectoController.nuevo',
  'POST /crear': 'ProyectoController.crear',
  'GET /proyecto/:id': 'ProyectoController.ver',
};