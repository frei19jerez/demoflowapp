/**
 * AdminController.js
 * Panel administrador de DemoFlow
 */

module.exports = {

  dashboard: async function(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({
        id: req.session.userId
      });

      if (!usuario || usuario.rol !== 'admin') {
        return res.forbidden('No tienes permiso para entrar al panel admin.');
      }

      const totalUsuarios = await Usuario.count();
      const totalProyectos = await Proyecto.count();
      const demosActivas = await Proyecto.count({ estadoDeploy: 'activo' });
      const deploysFallidos = await Proyecto.count({ estadoDeploy: 'fallido' });
      const totalPagos = await Pago.count();

      const usuarios = await Usuario.find()
        .sort('id DESC')
        .limit(10);

      const proyectos = await Proyecto.find()
        .sort('id DESC')
        .limit(10);

      const pagos = await Pago.find()
        .sort('id DESC')
        .limit(10);

      return res.view('pages/admin/dashboard', {
        titulo: 'Panel Admin',
        usuario,
        totalUsuarios,
        totalProyectos,
        demosActivas,
        deploysFallidos,
        totalPagos,
        usuarios,
        proyectos,
        pagos
      });

    } catch (err) {
      sails.log.error('❌ Error cargando panel admin');
      sails.log.error(err);
      return res.serverError('Error cargando panel admin.');
    }
  }

};