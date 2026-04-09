module.exports = {

  index: async function(req, res) {
    try {
      const proyectos = await Proyecto.find({
        activo: true
      }).sort('id DESC');

      return res.view('pages/homepage', {
        titulo: 'Inicio',
        proyectos,
        usuario: req.session.userId ? {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        } : null
      });

    } catch (err) {
      console.log('================ ERROR INDEX ================');
      console.log(err);
      console.log('============================================');
      return res.serverError('Error al cargar inicio');
    }
  },

  dashboard: async function(req, res) {
    try {
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

    } catch (err) {
      console.log('================ ERROR DASHBOARD ================');
      console.log(err);
      console.log('================================================');
      return res.serverError('Error al cargar dashboard');
    }
  },

  nuevo: async function(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      return res.view('pages/proyecto/nuevo', {
        titulo: 'Nuevo proyecto',
        usuario: {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        }
      });

    } catch (err) {
      console.log('================ ERROR NUEVO PROYECTO ================');
      console.log(err);
      console.log('======================================================');
      return res.serverError('Error al abrir formulario de proyecto');
    }
  },

  crear: async function(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const nombre = req.body.nombre ? req.body.nombre.trim() : '';
      const descripcion = req.body.descripcion ? req.body.descripcion.trim() : '';
      const tecnologia = req.body.tecnologia ? req.body.tecnologia.trim() : '';
      const urlDemo = req.body.urlDemo ? req.body.urlDemo.trim() : '';
      const urlRepositorio = req.body.urlRepositorio ? req.body.urlRepositorio.trim() : '';
      const tipoProyecto = req.body.tipoProyecto ? req.body.tipoProyecto.trim() : 'externo';

      if (!nombre || !urlDemo) {
        return res.badRequest('Nombre y URL demo son obligatorios.');
      }

      const slug = nombre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      await Proyecto.create({
        nombre,
        slug,
        descripcion,
        tecnologia,
        urlDemo,
        urlRepositorio,
        tipoProyecto,
        estado: 'borrador',
        destacado: false,
        activo: true,
        usuarioId: req.session.userId
      });

      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR CREAR PROYECTO ================');
      console.log(err);
      console.log('======================================================');
      return res.serverError('Error al crear proyecto');
    }
  },

  ver: async function(req, res) {
    try {
      const id = req.params.id;

      const proyecto = await Proyecto.findOne({ id });

      if (!proyecto) {
        return res.notFound('Proyecto no encontrado.');
      }

      return res.view('pages/ver', {
        titulo: proyecto.nombre,
        proyecto,
        usuario: req.session.userId ? {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        } : null
      });

    } catch (err) {
      console.log('================ ERROR VER PROYECTO ================');
      console.log(err);
      console.log('====================================================');
      return res.serverError('Error al ver proyecto');
    }
  }

};