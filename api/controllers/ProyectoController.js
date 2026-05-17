const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

function generarPuerto() {
  return Math.floor(4100 + Math.random() * 900);
}

function limpiarTextoRuta(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function limpiarCarpetaExtra(carpetaDestino) {
  if (!fs.existsSync(carpetaDestino)) {
    return;
  }

  const contenido = fs.readdirSync(carpetaDestino);

  if (contenido.length === 1) {
    const posibleCarpeta = path.join(carpetaDestino, contenido[0]);

    if (fs.existsSync(posibleCarpeta) && fs.lstatSync(posibleCarpeta).isDirectory()) {
      const archivosInternos = fs.readdirSync(posibleCarpeta);

      for (const archivo of archivosInternos) {
        fs.renameSync(
          path.join(posibleCarpeta, archivo),
          path.join(carpetaDestino, archivo)
        );
      }

      fs.rmdirSync(posibleCarpeta);
    }
  }
}

function obtenerLimiteSubida(tipoProyecto) {
  if (tipoProyecto === 'html') {
    return 300000000; // 300 MB
  }

  if (tipoProyecto === 'node' || tipoProyecto === 'sails') {
    return 2000000000; // 2 GB
  }

  return 500000000; // 500 MB
}

module.exports = {

  index: async function (req, res) {
    try {
      let proyectos = [];

      try {
        proyectos = await Proyecto.find({ activo: true }).sort('id DESC');
      } catch (e) {
        console.log('================ ERROR CONSULTANDO PROYECTOS ================');
        console.error(e.stack || e);
        console.log('============================================================');
      }

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

      let proyectos = [];

      try {
        proyectos = await Proyecto.find({
          usuario: req.session.userId
        }).sort('id DESC');
      } catch (e) {
        console.log('================ ERROR CONSULTANDO PROYECTOS DASHBOARD ================');
        console.error(e.stack || e);
        console.log('======================================================================');
      }

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

      const metodoEntrada = req.body.metodoEntrada ? req.body.metodoEntrada.trim() : 'zip';

      const nombre = req.body.nombre ? req.body.nombre.trim() : '';
      const descripcion = req.body.descripcion ? req.body.descripcion.trim() : '';
      const tecnologia = req.body.tecnologia ? req.body.tecnologia.trim() : '';
      const tipoProyecto = req.body.tipoProyecto ? req.body.tipoProyecto.trim() : 'html';
      const urlRepositorio = req.body.urlRepositorio ? req.body.urlRepositorio.trim() : '';
      const urlDemoIngresada = req.body.urlDemo ? req.body.urlDemo.trim() : '';
      const carpetaDemoIngresada = req.body.carpetaDemo ? req.body.carpetaDemo.trim() : '';
      const comandoInicio = req.body.comandoInicio ? req.body.comandoInicio.trim() : '';
      const archivoEntrada = req.body.archivoEntrada ? req.body.archivoEntrada.trim() : '';

      if (!nombre) {
        return res.badRequest('El nombre del proyecto es obligatorio.');
      }

      let slugBase = limpiarTextoRuta(req.body.slug ? req.body.slug.trim() : nombre);

      if (!slugBase) {
        return res.badRequest('Slug inválido.');
      }

      let slugFinal = slugBase;
      let contador = 2;

      while (await Proyecto.findOne({ slug: slugFinal })) {
        slugFinal = `${slugBase}-${contador}`;
        contador++;
      }

      let urlDemoFinal = null;
      let archivoZipOriginal = null;
      let carpetaDemoFinal = null;
      let carpetaRuntimeFinal = null;
      let comandoInicioFinal = comandoInicio || null;
      let archivoEntradaFinal = archivoEntrada || null;
      let puertoFinal = null;
      let deployType = 'external';
      let estadoDeploy = 'pendiente';
      let logDeploy = '';
      let tipoFinal = tipoProyecto;

      if (metodoEntrada === 'externo') {
        if (!urlDemoIngresada) {
          return res.badRequest('La URL externa es obligatoria.');
        }

        tipoFinal = 'externo';
        urlDemoFinal = urlDemoIngresada;
        deployType = 'external';
        estadoDeploy = 'activo';
        logDeploy = 'Proyecto externo registrado correctamente.';
      }

      else if (metodoEntrada === 'git') {
        if (!urlRepositorio) {
          return res.badRequest('La URL del repositorio es obligatoria para importar desde Git.');
        }

        tipoFinal = tipoProyecto === 'externo' ? 'node' : tipoProyecto;
        deployType = tipoFinal === 'html' ? 'static' : 'dynamic';
        estadoDeploy = 'subido';
        logDeploy = 'Repositorio Git registrado. Pendiente clonado/despliegue.';

        if (tipoFinal === 'node' || tipoFinal === 'sails') {
          carpetaRuntimeFinal = slugFinal;
          puertoFinal = generarPuerto();
          comandoInicioFinal = comandoInicio || (tipoFinal === 'sails' ? 'node app.js' : 'npm start');
          archivoEntradaFinal = archivoEntrada || 'app.js';
          logDeploy = `Repositorio Git registrado. Listo para clonar/desplegar en puerto ${puertoFinal}.`;
        }

        if (tipoFinal === 'html') {
          carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);
        }

        if (urlDemoIngresada) {
          urlDemoFinal = urlDemoIngresada;
          estadoDeploy = 'activo';
          logDeploy = 'Repositorio Git registrado con URL en vivo.';
        }
      }

      else if (metodoEntrada === 'zip') {
        const limiteSubida = obtenerLimiteSubida(tipoProyecto);

        const archivos = await new Promise((resolve, reject) => {
          req.file('archivoDemo').upload(
            { maxBytes: limiteSubida },
            function (err, uploadedFiles) {
              if (err) {
                return reject(err);
              }

              return resolve(uploadedFiles || []);
            }
          );
        });

        if (archivos.length === 0 && !urlDemoIngresada) {
          return res.badRequest('Debes subir un archivo o indicar una URL.');
        }

        if (archivos.length > 0) {
          const archivoSubido = archivos[0];
          const nombreArchivoOriginal = archivoSubido.filename || 'archivo-demo';
          const extension = path.extname(nombreArchivoOriginal).toLowerCase();

          archivoZipOriginal = nombreArchivoOriginal;

          if (tipoProyecto === 'html') {
            carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);

            const carpetaDestino = path.resolve(
              sails.config.appPath,
              'assets',
              'demos',
              carpetaDemoFinal
            );

            if (!fs.existsSync(carpetaDestino)) {
              fs.mkdirSync(carpetaDestino, { recursive: true });
            }

            if (extension === '.zip') {
              await fs
                .createReadStream(archivoSubido.fd)
                .pipe(unzipper.Extract({ path: carpetaDestino }))
                .promise();

              limpiarCarpetaExtra(carpetaDestino);

              urlDemoFinal = `/demos/${carpetaDemoFinal}/index.html`;
              deployType = 'static';
              estadoDeploy = 'activo';
              logDeploy = 'Proyecto HTML publicado correctamente desde ZIP.';
            }

            else if (extension === '.html' || extension === '.htm') {
              const destinoHtml = path.join(carpetaDestino, 'index.html');
              fs.copyFileSync(archivoSubido.fd, destinoHtml);

              urlDemoFinal = `/demos/${carpetaDemoFinal}/index.html`;
              deployType = 'static';
              estadoDeploy = 'activo';
              logDeploy = 'Archivo HTML publicado correctamente.';
            }

            else {
              return res.badRequest('Para proyectos HTML solo se permiten archivos .zip, .html o .htm.');
            }
          }

          else if (tipoProyecto === 'node' || tipoProyecto === 'sails') {
            if (extension !== '.zip') {
              return res.badRequest(`Para proyectos ${tipoProyecto} debes subir un archivo .zip.`);
            }

            carpetaRuntimeFinal = slugFinal;

            const carpetaDestinoRuntime = path.resolve(
              sails.config.appPath,
              'deploy_runtime',
              'apps',
              carpetaRuntimeFinal
            );

            if (!fs.existsSync(carpetaDestinoRuntime)) {
              fs.mkdirSync(carpetaDestinoRuntime, { recursive: true });
            }

            await fs
              .createReadStream(archivoSubido.fd)
              .pipe(unzipper.Extract({ path: carpetaDestinoRuntime }))
              .promise();

            limpiarCarpetaExtra(carpetaDestinoRuntime);

            puertoFinal = generarPuerto();
            comandoInicioFinal = comandoInicio || (tipoProyecto === 'sails' ? 'node app.js' : 'npm start');
            archivoEntradaFinal = archivoEntrada || 'app.js';

            deployType = 'dynamic';
            estadoDeploy = 'subido';
            urlDemoFinal = null;
            logDeploy = `Proyecto ${tipoProyecto} subido correctamente. Listo para iniciar en puerto ${puertoFinal}.`;
          }

          else {
            return res.badRequest(`Tipo de proyecto no válido para carga ZIP: ${tipoProyecto}`);
          }
        }

        else {
          if (tipoProyecto === 'html') {
            carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);
            urlDemoFinal = urlDemoIngresada || `/demos/${carpetaDemoFinal}/index.html`;
            deployType = 'static';
            estadoDeploy = 'activo';
            logDeploy = 'Proyecto HTML creado con ruta manual.';
          }

          else if (tipoProyecto === 'node' || tipoProyecto === 'sails') {
            if (!urlDemoIngresada) {
              return res.badRequest(`Para proyectos ${tipoProyecto} debes subir un .zip o indicar una URL.`);
            }

            carpetaRuntimeFinal = slugFinal;
            puertoFinal = generarPuerto();
            urlDemoFinal = urlDemoIngresada;
            deployType = 'dynamic';
            estadoDeploy = 'activo';
            comandoInicioFinal = comandoInicio || (tipoProyecto === 'sails' ? 'node app.js' : 'npm start');
            archivoEntradaFinal = archivoEntrada || 'app.js';
            logDeploy = `Proyecto ${tipoProyecto} registrado con URL manual.`;
          }

          else {
            return res.badRequest('Configuración no válida.');
          }
        }
      }

      else {
        return res.badRequest(`Método de entrada no válido: ${metodoEntrada}`);
      }

      await Proyecto.create({
        nombre,
        slug: slugFinal,
        descripcion: descripcion || null,
        tecnologia: tecnologia || null,
        urlDemo: urlDemoFinal || null,
        urlRepositorio: urlRepositorio || null,
        archivoZipOriginal: archivoZipOriginal || null,
        carpetaDemo: carpetaDemoFinal || null,
        carpetaRuntime: carpetaRuntimeFinal || null,
        comandoInicio: comandoInicioFinal || null,
        archivoEntrada: archivoEntradaFinal || null,
        puerto: puertoFinal || null,
        deployType,
        estadoDeploy,
        logDeploy,
        tipoProyecto: tipoFinal,
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
      const valor = req.params.id;
      let proyecto = null;

      try {
        if (!isNaN(valor)) {
          proyecto = await Proyecto.findOne({ id: Number(valor) });
        } else {
          proyecto = await Proyecto.findOne({ slug: valor });
        }
      } catch (e) {
        console.log('================ ERROR CONSULTANDO PROYECTO ================');
        console.error(e.stack || e);
        console.log('============================================================');
      }

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
  },

  eliminar: async function (req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const id = req.params.id;
      const proyecto = await Proyecto.findOne({ id });

      if (!proyecto) {
        return res.notFound('Proyecto no encontrado.');
      }

      const usuarioLogueado = await Usuario.findOne({ id: req.session.userId });

      if (!usuarioLogueado) {
        return res.forbidden('Usuario no autorizado.');
      }

      const propietarioId = (typeof proyecto.usuario === 'object' && proyecto.usuario !== null)
        ? proyecto.usuario.id
        : proyecto.usuario;

      const esDueno = Number(propietarioId) === Number(req.session.userId);
      const esAdmin = usuarioLogueado.rol === 'admin';

      if (!esDueno && !esAdmin) {
        return res.forbidden('No tienes permiso para eliminar este proyecto.');
      }

      if (proyecto.carpetaDemo) {
        const carpetaDestino = path.resolve(
          sails.config.appPath,
          'assets',
          'demos',
          proyecto.carpetaDemo
        );

        if (fs.existsSync(carpetaDestino)) {
          fs.rmSync(carpetaDestino, { recursive: true, force: true });
        }
      }

      if (proyecto.carpetaRuntime) {
        const carpetaRuntime = path.resolve(
          sails.config.appPath,
          'deploy_runtime',
          'apps',
          proyecto.carpetaRuntime
        );

        if (fs.existsSync(carpetaRuntime)) {
          fs.rmSync(carpetaRuntime, { recursive: true, force: true });
        }
      }

      await Proyecto.destroyOne({ id });

      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR ELIMINAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('=========================================================');
      return res.serverError('Error al eliminar proyecto.');
    }
  },

  listaDeploys: async function (req, res) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const proyectos = await Proyecto.find({
    usuario: req.session.userId
  }).sort('id DESC');

  return res.view('pages/deploy/lista', {
    titulo: 'Deploys',
    proyectos,
    usuario: {
      id: req.session.userId,
      nombre: req.session.userName,
      email: req.session.userEmail
    }
  });
},

estadoDeploy: async function (req, res) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const proyecto = await Proyecto.findOne({
    id: req.params.id,
    usuario: req.session.userId
  });

  if (!proyecto) {
    return res.notFound('Proyecto no encontrado.');
  }

  return res.view('pages/deploy/estado', {
    titulo: 'Estado del deploy',
    proyecto,
    usuario: {
      id: req.session.userId,
      nombre: req.session.userName,
      email: req.session.userEmail
    }
  });
}

};