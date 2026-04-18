const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

module.exports = {

  index: async function (req, res) {
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
      console.error(err.stack || err);
      console.log('============================================');
      return res.serverError('Error al cargar inicio');
    }
  },

  dashboard: async function (req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const proyectos = await Proyecto.find({
        usuario: req.session.userId
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
      console.error(err.stack || err);
      console.log('================================================');
      return res.serverError('Error al cargar dashboard');
    }
  },

  nuevo: async function (req, res) {
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
      console.error(err.stack || err);
      console.log('======================================================');
      return res.serverError('Error al abrir formulario de proyecto');
    }
  },

  crear: async function (req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const nombre = req.body.nombre ? req.body.nombre.trim() : '';
      const descripcion = req.body.descripcion ? req.body.descripcion.trim() : '';
      const tecnologia = req.body.tecnologia ? req.body.tecnologia.trim() : '';
      const urlRepositorio = req.body.urlRepositorio ? req.body.urlRepositorio.trim() : '';
      const tipoProyecto = req.body.tipoProyecto ? req.body.tipoProyecto.trim() : 'externo';
      const carpetaDemoIngresada = req.body.carpetaDemo ? req.body.carpetaDemo.trim() : '';
      let urlDemoIngresada = req.body.urlDemo ? req.body.urlDemo.trim() : '';

      if (!nombre) {
        return res.badRequest('El nombre es obligatorio.');
      }

      let slugBase = req.body.slug ? req.body.slug.trim() : nombre;

      slugBase = slugBase
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      if (!slugBase) {
        return res.badRequest('Slug inválido.');
      }

      let slugFinal = slugBase;
      let contador = 2;

      while (await Proyecto.findOne({ slug: slugFinal })) {
        slugFinal = `${slugBase}-${contador}`;
        contador++;
      }

      const carpetaDemoFinal = carpetaDemoIngresada || slugFinal;
      const carpetaDestino = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        carpetaDemoFinal
      );

      let archivoSubido = null;

      const archivos = await new Promise((resolve, reject) => {
        req.file('archivoDemo').upload({
          maxBytes: 50000000
        }, function (err, uploadedFiles) {
          if (err) {
            return reject(err);
          }
          return resolve(uploadedFiles || []);
        });
      });

      if (archivos.length > 0) {
        archivoSubido = archivos[0];

        if (!fs.existsSync(carpetaDestino)) {
          fs.mkdirSync(carpetaDestino, { recursive: true });
        }

        const nombreArchivoOriginal = archivoSubido.filename || 'archivo-demo';
        const extension = path.extname(nombreArchivoOriginal).toLowerCase();

        if (extension === '.zip') {
          await fs
            .createReadStream(archivoSubido.fd)
            .pipe(unzipper.Extract({ path: carpetaDestino }))
            .promise();

          if (tipoProyecto !== 'externo') {
            urlDemoIngresada = `/demos/${carpetaDemoFinal}/index.html`;
          }
        } else if (extension === '.html' || extension === '.htm') {
          const destinoHtml = path.join(carpetaDestino, 'index.html');
          fs.copyFileSync(archivoSubido.fd, destinoHtml);

          if (tipoProyecto !== 'externo') {
            urlDemoIngresada = `/demos/${carpetaDemoFinal}/index.html`;
          }
        }
      }

      let urlDemoFinal = '';

      if (tipoProyecto === 'externo') {
        if (!urlDemoIngresada) {
          return res.badRequest('La URL demo es obligatoria para proyectos externos.');
        }
        urlDemoFinal = urlDemoIngresada;
      } else {
        urlDemoFinal = urlDemoIngresada || `/demos/${carpetaDemoFinal}/index.html`;
      }

      await Proyecto.create({
        nombre,
        slug: slugFinal,
        descripcion,
        tecnologia,
        urlDemo: urlDemoFinal,
        urlRepositorio,
        tipoProyecto,
        carpetaDemo: carpetaDemoFinal,
        estado: 'borrador',
        destacado: false,
        activo: true,
        usuario: req.session.userId
      });

      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR CREAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('======================================================');
      return res.serverError('Error al crear proyecto');
    }
  },

  ver: async function (req, res) {
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
      console.error(err.stack || err);
      console.log('====================================================');
      return res.serverError('Error al ver proyecto');
    }
  }

};