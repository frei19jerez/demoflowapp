const bcrypt = require('bcryptjs');

function limpiarTexto(valor) {
  return String(valor || '').trim();
}

function limpiarEmail(valor) {
  return String(valor || '').trim().toLowerCase();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function analizarPasswordIA(password) {
  if (!password || password.length < 6) {
    return 'La contraseña debe tener mínimo 6 caracteres.';
  }

  if (password === '123456' || password === '123123' || password === 'password') {
    return 'Por seguridad, usa una contraseña más fuerte.';
  }

  return null;
}

module.exports = {

  registerPage: function (req, res) {
    try {
      if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
      }

      return res.view('pages/auth/register', {
        titulo: 'Registro'
      });

    } catch (err) {
      sails.log.error('=========== ERROR CARGANDO REGISTER PAGE ===========');
      sails.log.error(err);
      sails.log.error('====================================================');
      return res.serverError('Error cargando la página de registro.');
    }
  },

  loginPage: function (req, res) {
    try {
      if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
      }

      return res.view('pages/auth/login', {
        titulo: 'Iniciar sesión'
      });

    } catch (err) {
      sails.log.error('============= ERROR CARGANDO LOGIN PAGE =============');
      sails.log.error(err);
      sails.log.error('=====================================================');
      return res.serverError('Error cargando la página de inicio de sesión.');
    }
  },

  register: async function (req, res) {
    try {
      const nombre = limpiarTexto(req.body.nombre || req.body.name);
      const email = limpiarEmail(req.body.email || req.body.correo);
      const password = limpiarTexto(req.body.password || req.body.contrasena);
      const confirmPassword = limpiarTexto(
        req.body.confirmPassword ||
        req.body.confirmarPassword ||
        req.body.confirm_password ||
        req.body.repetirPassword
      );

      if (!nombre || !email || !password || !confirmPassword) {
        return res.badRequest('Todos los campos son obligatorios.');
      }

      if (!validarEmail(email)) {
        return res.badRequest('El correo no tiene un formato válido.');
      }

      const errorPassword = analizarPasswordIA(password);
      if (errorPassword) {
        return res.badRequest(errorPassword);
      }

      if (password !== confirmPassword) {
        return res.badRequest('Las contraseñas no coinciden.');
      }

      const existe = await Usuario.findOne({ email });

      if (existe) {
        return res.badRequest('Ese correo ya está registrado.');
      }

      const nuevoUsuario = await Usuario.create({
        nombre,
        email,
        password,
        rol: 'programador',
        activo: true
      }).fetch();

      sails.log.info('🤖 IA AUTH: USUARIO CREADO OK:', nuevoUsuario.email);

      req.session.userId = nuevoUsuario.id;
      req.session.userName = nuevoUsuario.nombre;
      req.session.userEmail = nuevoUsuario.email;

      return req.session.save(function (err) {
        if (err) {
          sails.log.error('=========== ERROR GUARDANDO SESION EN REGISTRO ===========');
          sails.log.error(err);
          sails.log.error('==========================================================');
          return res.serverError('Usuario creado, pero no se pudo guardar la sesión.');
        }

        return res.redirect('/dashboard');
      });

    } catch (err) {
      sails.log.error('================ ERROR EN REGISTRO ================');
      sails.log.error(err);
      sails.log.error('BODY RECIBIDO EN REGISTER:');
      sails.log.error(req.body);
      sails.log.error('===================================================');
      return res.serverError('Error al registrar usuario.');
    }
  },

  login: async function (req, res) {
    try {
      const email = limpiarEmail(req.body.email || req.body.correo);
      const password = limpiarTexto(req.body.password || req.body.contrasena);

      if (!email || !password) {
        return res.badRequest('Correo y contraseña son obligatorios.');
      }

      if (!validarEmail(email)) {
        return res.badRequest('El correo no tiene un formato válido.');
      }

      const usuario = await Usuario.findOne({ email });

      if (!usuario) {
        return res.badRequest('Correo no encontrado.');
      }

      if (!usuario.activo) {
        return res.forbidden('Tu cuenta está desactivada.');
      }

      if (!usuario.password) {
        sails.log.error('El usuario no tiene contraseña:', usuario.email);
        return res.serverError('La cuenta no tiene contraseña válida.');
      }

      const ok = await bcrypt.compare(password, usuario.password);

      if (!ok) {
        return res.badRequest('Contraseña incorrecta.');
      }

      sails.log.info('🤖 IA AUTH: LOGIN OK:', usuario.email);

      req.session.userId = usuario.id;
      req.session.userName = usuario.nombre;
      req.session.userEmail = usuario.email;

      return req.session.save(function (err) {
        if (err) {
          sails.log.error('============= ERROR GUARDANDO SESION EN LOGIN =============');
          sails.log.error(err);
          sails.log.error('===========================================================');
          return res.serverError('No se pudo guardar la sesión.');
        }

        return res.redirect('/dashboard');
      });

    } catch (err) {
      sails.log.error('================ ERROR EN LOGIN ===================');
      sails.log.error(err);
      sails.log.error('BODY RECIBIDO EN LOGIN:');
      sails.log.error(req.body);
      sails.log.error('===================================================');
      return res.serverError('Error al iniciar sesión.');
    }
  },

  logout: function (req, res) {
    if (!req.session) {
      return res.redirect('/login');
    }

    req.session.destroy(function (err) {
      if (err) {
        sails.log.error('================ ERROR EN LOGOUT ==================');
        sails.log.error(err);
        sails.log.error('===================================================');
        return res.serverError('No se pudo cerrar sesión.');
      }

      return res.redirect('/login');
    });
  }

};