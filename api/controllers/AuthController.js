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

  if (
    password === '123456' ||
    password === '123123' ||
    password.toLowerCase() === 'password'
  ) {
    return 'Por seguridad, usa una contraseña más fuerte.';
  }

  return null;
}

function guardarFlash(req, tipo, mensaje) {
  req.session.flash = {
    tipo,
    mensaje
  };
}

function obtenerFlash(req) {
  const flash = req.session.flash || null;
  req.session.flash = null;
  return flash;
}

module.exports = {

  registerPage: function (req, res) {
    try {
      if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
      }

      const flash = obtenerFlash(req);

      return res.view('pages/auth/register', {
        titulo: 'Registro',
        flash
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

      const flash = obtenerFlash(req);

      return res.view('pages/auth/login', {
        titulo: 'Iniciar sesión',
        flash
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
        guardarFlash(req, 'error', 'Todos los campos son obligatorios.');
        return res.redirect('/register');
      }

      if (!validarEmail(email)) {
        guardarFlash(req, 'error', 'El correo no tiene un formato válido.');
        return res.redirect('/register');
      }

      const errorPassword = analizarPasswordIA(password);

      if (errorPassword) {
        guardarFlash(req, 'error', errorPassword);
        return res.redirect('/register');
      }

      if (password !== confirmPassword) {
        guardarFlash(req, 'error', 'Las contraseñas no coinciden.');
        return res.redirect('/register');
      }

      const existe = await Usuario.findOne({ email });

      if (existe) {
        guardarFlash(req, 'error', 'Ese correo ya está registrado.');
        return res.redirect('/register');
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

      guardarFlash(req, 'error', 'Error al registrar usuario.');
      return res.redirect('/register');
    }
  },

  login: async function (req, res) {
    try {
      const email = limpiarEmail(req.body.email || req.body.correo);
      const password = limpiarTexto(req.body.password || req.body.contrasena);

      if (!email || !password) {
        guardarFlash(req, 'error', 'Correo y contraseña son obligatorios.');
        return res.redirect('/login');
      }

      if (!validarEmail(email)) {
        guardarFlash(req, 'error', 'El correo no tiene un formato válido.');
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({ email });

      if (!usuario) {
        guardarFlash(req, 'error', 'Correo no encontrado.');
        return res.redirect('/login');
      }

      if (!usuario.activo) {
        guardarFlash(req, 'error', 'Tu cuenta está desactivada.');
        return res.redirect('/login');
      }

      if (!usuario.password) {
        sails.log.error('El usuario no tiene contraseña:', usuario.email);
        guardarFlash(req, 'error', 'La cuenta no tiene contraseña válida.');
        return res.redirect('/login');
      }

      const ok = await bcrypt.compare(password, usuario.password);

      if (!ok) {
        guardarFlash(req, 'error', 'Contraseña incorrecta.');
        return res.redirect('/login');
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

      guardarFlash(req, 'error', 'Error al iniciar sesión.');
      return res.redirect('/login');
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