/**
 * AdminController.js
 * Panel administrador de DemoFlow
 */

const bcrypt = require('bcryptjs');

module.exports = {

  loginPage: async function(req, res) {
    return res.view('pages/admin/login', {
      titulo: 'Login Admin',
      error: null
    });
  },

  login: async function(req, res) {
    try {
      const { email, password } = req.body;

      const usuario = await Usuario.findOne({ email });

      if (!usuario || usuario.rol !== 'admin') {
        return res.view('pages/admin/login', {
          titulo: 'Login Admin',
          error: 'Acceso no autorizado.'
        });
      }

      const passwordOk = await bcrypt.compare(password, usuario.password);

      if (!passwordOk) {
        return res.view('pages/admin/login', {
          titulo: 'Login Admin',
          error: 'Correo o contraseña incorrectos.'
        });
      }

      req.session.userId = usuario.id;
      req.session.userName = usuario.nombre;
      req.session.userEmail = usuario.email;
      req.session.admin = true;

      return res.redirect('/admin');

    } catch (err) {
      sails.log.error(err);
      return res.serverError('Error iniciando sesión admin.');
    }
  },

  registerPage: async function(req, res) {
    return res.view('pages/admin/register', {
      titulo: 'Registrar Admin',
      error: null
    });
  },

  register: async function(req, res) {
    try {
      const { nombre, email, password, claveAdmin } = req.body;

      if (claveAdmin !== process.env.ADMIN_SECRET) {
        return res.view('pages/admin/register', {
          titulo: 'Registrar Admin',
          error: 'Clave de administración incorrecta.'
        });
      }

      const existe = await Usuario.findOne({ email });

      if (existe) {
        return res.view('pages/admin/register', {
          titulo: 'Registrar Admin',
          error: 'Ese correo ya existe.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const admin = await Usuario.create({
        nombre,
        email,
        password: passwordHash,
        rol: 'admin',
        creditos: 9999,
        acceso_ia: true,
        activo: true
      }).fetch();

      req.session.userId = admin.id;
      req.session.userName = admin.nombre;
      req.session.userEmail = admin.email;
      req.session.admin = true;

      return res.redirect('/admin');

    } catch (err) {
      sails.log.error(err);
      return res.serverError('Error registrando admin.');
    }
  },

  logout: async function(req, res) {
    req.session.destroy(function() {
      return res.redirect('/admin/login');
    });
  },

  dashboard: async function(req, res) {
    try {
      if (!req.session.userId || !req.session.admin) {
        return res.redirect('/admin/login');
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

      const usuarios = await Usuario.find().sort('id DESC').limit(10);
      const proyectos = await Proyecto.find().sort('id DESC').limit(10);
      const pagos = await Pago.find().sort('id DESC').limit(10);

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