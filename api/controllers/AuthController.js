const bcrypt = require('bcryptjs');

module.exports = {

  registerPage: async function(req, res) {
    return res.view('pages/auth/register', {
      titulo: 'Registro'
    });
  },

  loginPage: async function(req, res) {
    return res.view('pages/auth/login', {
      titulo: 'Iniciar sesión'
    });
  },

  register: async function(req, res) {
    try {
      const nombre = req.body.nombre ? req.body.nombre.trim() : '';
      const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
      const password = req.body.password ? req.body.password.trim() : '';
      const confirmPassword = req.body.confirmPassword ? req.body.confirmPassword.trim() : '';

      if (!nombre || !email || !password || !confirmPassword) {
        return res.badRequest('Todos los campos son obligatorios.');
      }

      if (password !== confirmPassword) {
        return res.badRequest('Las contraseñas no coinciden.');
      }

      const existe = await Usuario.findOne({ email });

      if (existe) {
        return res.badRequest('Ese correo ya está registrado.');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const nuevoUsuario = await Usuario.create({
        nombre,
        email,
        password: passwordHash,
        plan: 'gratis',
        activo: true
      }).fetch();

      req.session.userId = nuevoUsuario.id;
      req.session.userName = nuevoUsuario.nombre;
      req.session.userEmail = nuevoUsuario.email;

      return res.redirect('/dashboard');

    } catch (err) {
      sails.log.error('================ ERROR EN REGISTRO ================');
      sails.log.error(err);
      sails.log.error('===================================================');
      return res.serverError('Error al registrar usuario.');
    }
  },

  login: async function(req, res) {
    try {
      const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
      const password = req.body.password ? req.body.password.trim() : '';

      if (!email || !password) {
        return res.badRequest('Correo y contraseña son obligatorios.');
      }

      const usuario = await Usuario.findOne({ email });

      if (!usuario) {
        return res.badRequest('Correo no encontrado.');
      }

      if (!usuario.activo) {
        return res.forbidden('Tu cuenta está desactivada.');
      }

      let ok = false;

      try {
        ok = await bcrypt.compare(password, usuario.password);
      } catch (e) {
        sails.log.error('Error comparando contraseña:', e);
        return res.serverError('Error validando contraseña.');
      }

      if (!ok) {
        return res.badRequest('Contraseña incorrecta.');
      }

      req.session.userId = usuario.id;
      req.session.userName = usuario.nombre;
      req.session.userEmail = usuario.email;

      return res.redirect('/dashboard');

    } catch (err) {
      sails.log.error('================ ERROR EN LOGIN ================');
      sails.log.error(err);
      sails.log.error('================================================');
      return res.serverError('Error al iniciar sesión.');
    }
  },

  logout: async function(req, res) {
    req.session.destroy(function(err) {
      if (err) {
        return res.serverError('No se pudo cerrar sesión.');
      }

      return res.redirect('/login');
    });
  }

};