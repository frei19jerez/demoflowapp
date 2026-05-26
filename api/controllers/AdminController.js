/**
 * AdminController.js
 * Panel administrador de DemoFlow
 */

const bcrypt = require('bcryptjs');

module.exports = {

  /**
   * ===============================
   * LOGIN PAGE
   * ===============================
   */
  loginPage: async function(req, res) {

    return res.view('pages/admin/login', {
      titulo: 'Login Admin',
      error: null
    });

  },

  /**
   * ===============================
   * LOGIN ADMIN
   * ===============================
   */
  login: async function(req, res) {

    try {

      const { email, password } = req.body;

      const usuario = await Usuario.findOne({
        email: email
      });

      if (!usuario) {

        return res.view('pages/admin/login', {
          titulo: 'Login Admin',
          error: 'Usuario no encontrado.'
        });

      }

      if (usuario.rol !== 'admin') {

        return res.view('pages/admin/login', {
          titulo: 'Login Admin',
          error: 'No tienes permisos de administrador.'
        });

      }

      const passwordOk = await bcrypt.compare(
        password,
        usuario.password
      );

      if (!passwordOk) {

        return res.view('pages/admin/login', {
          titulo: 'Login Admin',
          error: 'Contraseña incorrecta.'
        });

      }

      // ===============================
      // SESSION ADMIN
      // ===============================

      req.session.userId = usuario.id;
      req.session.userName = usuario.nombre;
      req.session.userEmail = usuario.email;
      req.session.admin = true;

      sails.log.info('✅ Admin logueado:', usuario.email);

      return res.redirect('/admin');

    } catch (err) {

      sails.log.error('❌ Error login admin');
      sails.log.error(err);

      return res.serverError('Error iniciando sesión admin.');

    }

  },

  /**
   * ===============================
   * REGISTER PAGE
   * ===============================
   */
  registerPage: async function(req, res) {

    return res.view('pages/admin/register', {
      titulo: 'Registro Admin',
      error: null
    });

  },

  /**
   * ===============================
   * REGISTER ADMIN
   * ===============================
   */
  register: async function(req, res) {

    try {

      const {
        nombre,
        email,
        password,
        claveAdmin
      } = req.body;

      // ===============================
      // VALIDAR CLAVE ADMIN
      // ===============================

      if (claveAdmin !== process.env.ADMIN_SECRET) {

        return res.view('pages/admin/register', {
          titulo: 'Registro Admin',
          error: 'Clave de administración incorrecta.'
        });

      }

      // ===============================
      // VALIDAR EMAIL
      // ===============================

      const existe = await Usuario.findOne({
        email
      });

      if (existe) {

        return res.view('pages/admin/register', {
          titulo: 'Registro Admin',
          error: 'Ese correo ya existe.'
        });

      }

      // ===============================
      // HASH PASSWORD
      // ===============================

      const passwordHash = await bcrypt.hash(password, 10);

      // ===============================
      // CREAR ADMIN
      // ===============================

      const admin = await Usuario.create({

        nombre: nombre,
        email: email,
        password: passwordHash,

        rol: 'admin',

        creditos: 9999,

        acceso_ia: true,

        activo: true

      }).fetch();

      sails.log.info('✅ Admin creado:', admin.email);

      // ===============================
      // SESSION
      // ===============================

      req.session.userId = admin.id;
      req.session.userName = admin.nombre;
      req.session.userEmail = admin.email;
      req.session.admin = true;

      return res.redirect('/admin');

    } catch (err) {

      sails.log.error('❌ Error creando admin');
      sails.log.error(err);

      return res.serverError('Error registrando administrador.');

    }

  },

  /**
   * ===============================
   * LOGOUT
   * ===============================
   */
  logout: async function(req, res) {

    req.session.destroy(function() {

      return res.redirect('/admin/login');

    });

  },

  /**
   * ===============================
   * DASHBOARD ADMIN
   * ===============================
   */
  dashboard: async function(req, res) {

    try {

      // ===============================
      // VALIDAR LOGIN
      // ===============================

      if (!req.session.userId || !req.session.admin) {

        return res.redirect('/admin/login');

      }

      // ===============================
      // BUSCAR ADMIN
      // ===============================

      const usuario = await Usuario.findOne({
        id: req.session.userId
      });

      if (!usuario) {

        return res.redirect('/admin/login');

      }

      if (usuario.rol !== 'admin') {

        return res.forbidden('No autorizado.');

      }

      // ===============================
      // ESTADÍSTICAS
      // ===============================

      const totalUsuarios = await Usuario.count();

      const totalProyectos = await Proyecto.count();

      const demosActivas = await Proyecto.count({
        estadoDeploy: 'activo'
      });

      const deploysFallidos = await Proyecto.count({
        estadoDeploy: 'fallido'
      });

      const totalPagos = await Pago.count();

      // ===============================
      // LISTADOS
      // ===============================

      const usuarios = await Usuario.find()
        .sort('id DESC')
        .limit(10);

      const proyectos = await Proyecto.find()
        .sort('id DESC')
        .limit(10);

      const pagos = await Pago.find()
        .sort('id DESC')
        .limit(10);

      // ===============================
      // RENDER VIEW
      // ===============================

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

      sails.log.error('❌ Error panel admin');
      sails.log.error(err);

      return res.serverError('Error cargando panel admin.');

    }

  }

};