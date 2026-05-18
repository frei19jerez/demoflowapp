const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
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

function obtenerLimiteSubida(tipoProyecto) {
  return 80 * 1024 * 1024;
}

function crearCarpeta(ruta) {
  if (!fs.existsSync(ruta)) {
    fs.mkdirSync(ruta, { recursive: true });
  }
}

function eliminarCarpeta(ruta) {
  if (fs.existsSync(ruta)) {
    fs.rmSync(ruta, { recursive: true, force: true });
  }
}

function copiarCarpeta(origen, destino) {
  crearCarpeta(destino);

  const items = fs.readdirSync(origen, { withFileTypes: true });

  for (const item of items) {
    const origenItem = path.join(origen, item.name);
    const destinoItem = path.join(destino, item.name);

    if (item.isDirectory()) {
      if (
        item.name === 'node_modules' ||
        item.name === '.git' ||
        item.name === '.tmp' ||
        item.name === '.vscode' ||
        item.name === 'uploads'
      ) {
        continue;
      }

      copiarCarpeta(origenItem, destinoItem);
    } else {
      fs.copyFileSync(origenItem, destinoItem);
    }
  }
}

function buscarArchivoRecursivo(carpeta, nombreArchivo) {
  if (!fs.existsSync(carpeta)) return null;

  const items = fs.readdirSync(carpeta, { withFileTypes: true });

  for (const item of items) {
    const ruta = path.join(carpeta, item.name);

    if (item.isFile() && item.name.toLowerCase() === nombreArchivo.toLowerCase()) {
      return ruta;
    }

    if (item.isDirectory()) {
      const encontrado = buscarArchivoRecursivo(ruta, nombreArchivo);
      if (encontrado) return encontrado;
    }
  }

  return null;
}

function detectarTipoIA(carpeta, tipoFormulario) {
  const tieneIndex = buscarArchivoRecursivo(carpeta, 'index.html');
  const tienePackage = buscarArchivoRecursivo(carpeta, 'package.json');
  const tieneSailsRoutes = path.join(carpeta, 'config', 'routes.js');

  if (fs.existsSync(tieneSailsRoutes)) return 'sails';
  if (tienePackage) return 'node';
  if (tieneIndex) return 'html';

  return tipoFormulario || 'html';
}

function generarDescripcionIA(tipo, nombre) {
  if (tipo === 'html') {
    return `Aplicación frontend ${nombre} desarrollada con HTML, CSS y JavaScript, publicada automáticamente en DemoFlow.`;
  }

  if (tipo === 'sails') {
    return `Aplicación Sails.js ${nombre} detectada automáticamente y preparada para despliegue dinámico en DemoFlow.`;
  }

  if (tipo === 'node') {
    return `Aplicación Node.js ${nombre} detectada automáticamente y preparada para ejecución en DemoFlow.`;
  }

  return `Proyecto ${nombre} registrado en DemoFlow.`;
}

function publicarHtmlEnRender(carpetaOrigen, carpetaDemoFinal) {
  const destinoAssets = path.resolve(
    sails.config.appPath,
    'assets',
    'demos',
    carpetaDemoFinal
  );

  const destinoTmp = path.resolve(
    sails.config.appPath,
    '.tmp',
    'public',
    'demos',
    carpetaDemoFinal
  );

  eliminarCarpeta(destinoAssets);
  eliminarCarpeta(destinoTmp);

  crearCarpeta(destinoAssets);
  crearCarpeta(destinoTmp);

  copiarCarpeta(carpetaOrigen, destinoAssets);
  copiarCarpeta(carpetaOrigen, destinoTmp);
}

function limpiarCarpetaExtra(carpetaDestino) {
  if (!fs.existsSync(carpetaDestino)) return;

  const indexDirecto = path.join(carpetaDestino, 'index.html');

  if (fs.existsSync(indexDirecto)) return;

  const indexEncontrado = buscarArchivoRecursivo(carpetaDestino, 'index.html');

  if (!indexEncontrado) return;

  const carpetaReal = path.dirname(indexEncontrado);
  const carpetaTemporal = carpetaDestino + '_tmp_' + Date.now();

  fs.renameSync(carpetaReal, carpetaTemporal);

  eliminarCarpeta(carpetaDestino);
  crearCarpeta(carpetaDestino);

  copiarCarpeta(carpetaTemporal, carpetaDestino);
  eliminarCarpeta(carpetaTemporal);
}

function clonarGitEnSegundoPlano(proyectoId, urlRepositorio, ramaGit, carpetaRuntimeFinal) {
  const carpetaDestinoRuntime = path.resolve(
    sails.config.appPath,
    'deploy_runtime',
    'apps',
    carpetaRuntimeFinal
  );

  eliminarCarpeta(carpetaDestinoRuntime);
  crearCarpeta(carpetaDestinoRuntime);

  const rama = ramaGit && ramaGit.trim() !== '' ? ramaGit.trim() : 'main';

  const comando = `git clone --branch ${rama} "${urlRepositorio}" "${carpetaDestinoRuntime}"`;

  Proyecto.updateOne({ id: proyectoId }).set({
    estadoDeploy: 'clonando',
    logDeploy:
      '🤖 DemoFlow IA inició clonación desde Git.\n' +
      `Repositorio: ${urlRepositorio}\n` +
      `Rama: ${rama}\n`
  }).exec(() => {});

  exec(comando, async function (error, stdout, stderr) {
    let log = '';

    if (stdout) log += `\n[STDOUT]\n${stdout}`;
    if (stderr) log += `\n[STDERR]\n${stderr}`;

    if (error) {
      await Proyecto.updateOne({ id: proyectoId }).set({
        estadoDeploy: 'fallido',
        logDeploy:
          '❌ Error clonando repositorio Git.\n' +
          log +
          `\n${error.message}`
      });

      return;
    }

    const tipoDetectado = detectarTipoIA(carpetaDestinoRuntime, 'node');

    await Proyecto.updateOne({ id: proyectoId }).set({
      tipoProyecto: tipoDetectado,
      estadoDeploy: 'subido',
      logDeploy:
        '✅ Repositorio Git clonado correctamente.\n' +
        `Tipo detectado: ${tipoDetectado}\n` +
        'Listo para desplegar desde el panel.\n' +
        log
    });
  });
}

module.exports = {

  index: async function (req, res) {
    try {
      const proyectos = await Proyecto.find({ activo: true }).sort('id DESC');

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

      return res.status(500).send(
        '<pre style="white-space:pre-wrap;font-size:16px;">' +
        (err.stack || err.message || err) +
        '</pre>'
      );
    }
  },

  crear: async function (req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const metodoEntrada = req.body.metodoEntrada ? req.body.metodoEntrada.trim() : 'zip';

      const nombre = req.body.nombre ? req.body.nombre.trim() : '';
      const descripcionIngresada = req.body.descripcion ? req.body.descripcion.trim() : '';
      const tecnologiaIngresada = req.body.tecnologia ? req.body.tecnologia.trim() : '';
      const tipoProyecto = req.body.tipoProyecto ? req.body.tipoProyecto.trim() : 'html';
      const urlRepositorio = req.body.urlRepositorio ? req.body.urlRepositorio.trim() : '';
      const ramaGit = req.body.ramaGit ? req.body.ramaGit.trim() : 'main';
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
      let descripcionFinal = descripcionIngresada || null;
      let tecnologiaFinal = tecnologiaIngresada || null;

      if (metodoEntrada === 'externo') {
        if (!urlDemoIngresada) {
          return res.badRequest('La URL externa es obligatoria.');
        }

        tipoFinal = 'externo';
        urlDemoFinal = urlDemoIngresada;
        deployType = 'external';
        estadoDeploy = 'activo';
        descripcionFinal = descripcionFinal || generarDescripcionIA('externo', nombre);
        tecnologiaFinal = tecnologiaFinal || 'Demo externa';
        logDeploy = 'Proyecto externo registrado correctamente.';
      }

      else if (metodoEntrada === 'git') {
        if (!urlRepositorio) {
          return res.badRequest('La URL del repositorio es obligatoria para importar desde Git.');
        }

        tipoFinal = tipoProyecto === 'externo' ? 'node' : tipoProyecto;
        deployType = tipoFinal === 'html' ? 'static' : 'dynamic';
        estadoDeploy = 'registrado';

        descripcionFinal = descripcionFinal || generarDescripcionIA(tipoFinal, nombre);
        tecnologiaFinal = tecnologiaFinal || (
          tipoFinal === 'sails'
            ? 'Sails.js + Node.js + PostgreSQL'
            : tipoFinal === 'node'
              ? 'Node.js'
              : 'HTML + CSS + JavaScript'
        );

        if (tipoFinal === 'node' || tipoFinal === 'sails') {
          carpetaRuntimeFinal = slugFinal;
          puertoFinal = generarPuerto();
          comandoInicioFinal = comandoInicio || (tipoFinal === 'sails' ? 'node app.js' : 'npm start');
          archivoEntradaFinal = archivoEntrada || 'app.js';
        }

        if (tipoFinal === 'html') {
          carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);
        }

        if (urlDemoIngresada) {
          urlDemoFinal = urlDemoIngresada;
          estadoDeploy = 'activo';
          logDeploy = 'Repositorio Git registrado con URL en vivo.';
        } else {
          logDeploy =
            '🤖 DemoFlow IA registró el repositorio Git.\n' +
            `Repositorio: ${urlRepositorio}\n` +
            `Rama: ${ramaGit || 'main'}\n` +
            'Clonación iniciará en segundo plano.';
        }
      }

      else if (metodoEntrada === 'zip') {
        const limiteSubida = obtenerLimiteSubida(tipoProyecto);

        const archivos = await new Promise((resolve, reject) => {
          req.file('archivoDemo').upload(
            {
              maxBytes: limiteSubida
            },
            function (err, uploadedFiles) {
              if (err) return reject(err);
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

          const carpetaTemporalIA = path.resolve(
            sails.config.appPath,
            '.tmp',
            'demoflow-ia',
            `${slugFinal}-${Date.now()}`
          );

          eliminarCarpeta(carpetaTemporalIA);
          crearCarpeta(carpetaTemporalIA);

          if (extension === '.zip') {
            try {
              await fs
                .createReadStream(archivoSubido.fd)
                .pipe(unzipper.Extract({ path: carpetaTemporalIA }))
                .promise();
            } catch (errorZip) {
              eliminarCarpeta(carpetaTemporalIA);

              console.log('================ ERROR ZIP ================');
              console.error(errorZip.stack || errorZip);
              console.log('===========================================');

              return res.badRequest(
                'No se pudo extraer el ZIP. El archivo puede estar corrupto o contener demasiados archivos.'
              );
            }

            const carpetasBloqueadas = [
              'node_modules',
              '.git',
              '.vscode',
              'uploads',
              '.tmp'
            ];

            carpetasBloqueadas.forEach((nombreCarpeta) => {
              const rutaEliminar = path.join(carpetaTemporalIA, nombreCarpeta);

              if (fs.existsSync(rutaEliminar)) {
                eliminarCarpeta(rutaEliminar);
              }
            });

            limpiarCarpetaExtra(carpetaTemporalIA);
          }

          else if (extension === '.html' || extension === '.htm') {
            fs.copyFileSync(
              archivoSubido.fd,
              path.join(carpetaTemporalIA, 'index.html')
            );
          }

          else {
            eliminarCarpeta(carpetaTemporalIA);
            return res.badRequest('Archivo no permitido. Usa .zip, .html o .htm.');
          }

          tipoFinal = detectarTipoIA(carpetaTemporalIA, tipoProyecto);

          descripcionFinal = descripcionFinal || generarDescripcionIA(tipoFinal, nombre);

          tecnologiaFinal = tecnologiaFinal || (
            tipoFinal === 'sails'
              ? 'Sails.js + Node.js + PostgreSQL'
              : tipoFinal === 'node'
                ? 'Node.js'
                : 'HTML + CSS + JavaScript'
          );

          if (tipoFinal === 'html') {
            const indexDetectado = buscarArchivoRecursivo(carpetaTemporalIA, 'index.html');

            if (!indexDetectado) {
              eliminarCarpeta(carpetaTemporalIA);
              return res.badRequest('El ZIP no contiene index.html.');
            }

            carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);

            publicarHtmlEnRender(carpetaTemporalIA, carpetaDemoFinal);

            urlDemoFinal = `/demos/${carpetaDemoFinal}/index.html`;
            deployType = 'static';
            estadoDeploy = 'activo';

            logDeploy =
              '🤖 DemoFlow IA publicó el proyecto HTML correctamente.\n' +
              '✅ index.html detectado\n' +
              '✅ carpetas organizadas\n' +
              `✅ URL generada: ${urlDemoFinal}\n` +
              `📁 Carpeta demo: ${carpetaDemoFinal}`;
          }

          else if (tipoFinal === 'node' || tipoFinal === 'sails') {
            carpetaRuntimeFinal = slugFinal;

            const carpetaDestinoRuntime = path.resolve(
              sails.config.appPath,
              'deploy_runtime',
              'apps',
              carpetaRuntimeFinal
            );

            eliminarCarpeta(carpetaDestinoRuntime);
            crearCarpeta(carpetaDestinoRuntime);

            copiarCarpeta(carpetaTemporalIA, carpetaDestinoRuntime);

            puertoFinal = generarPuerto();
            comandoInicioFinal = comandoInicio || (tipoFinal === 'sails' ? 'node app.js' : 'npm start');
            archivoEntradaFinal = archivoEntrada || 'app.js';

            deployType = 'dynamic';
            estadoDeploy = 'subido';
            urlDemoFinal = null;

            logDeploy =
              `🤖 DemoFlow IA detectó proyecto ${tipoFinal}.\n` +
              `✅ Runtime preparado\n` +
              `✅ Puerto asignado: ${puertoFinal}\n` +
              `✅ Comando sugerido: ${comandoInicioFinal}\n` +
              'Pendiente desplegar desde el panel.';
          }

          else {
            eliminarCarpeta(carpetaTemporalIA);
            return res.badRequest(`Tipo de proyecto no válido: ${tipoFinal}`);
          }

          eliminarCarpeta(carpetaTemporalIA);
        }

        else {
          if (tipoProyecto === 'html') {
            carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);
            urlDemoFinal = urlDemoIngresada || `/demos/${carpetaDemoFinal}/index.html`;
            deployType = 'static';
            estadoDeploy = 'activo';
            tipoFinal = 'html';
            descripcionFinal = descripcionFinal || generarDescripcionIA('html', nombre);
            tecnologiaFinal = tecnologiaFinal || 'HTML + CSS + JavaScript';
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
            tipoFinal = tipoProyecto;
            comandoInicioFinal = comandoInicio || (tipoProyecto === 'sails' ? 'node app.js' : 'npm start');
            archivoEntradaFinal = archivoEntrada || 'app.js';
            descripcionFinal = descripcionFinal || generarDescripcionIA(tipoProyecto, nombre);
            tecnologiaFinal = tecnologiaFinal || (tipoFinal === 'sails' ? 'Sails.js + Node.js + PostgreSQL' : 'Node.js');
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

      const proyectoCreado = await Proyecto.create({
        nombre,
        slug: slugFinal,
        descripcion: descripcionFinal || null,
        tecnologia: tecnologiaFinal || null,
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
      }).fetch();

      if (metodoEntrada === 'git' && urlRepositorio && !urlDemoFinal) {
        clonarGitEnSegundoPlano(
          proyectoCreado.id,
          urlRepositorio,
          ramaGit,
          carpetaRuntimeFinal || slugFinal
        );
      }

      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR CREAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('======================================================');

      return res.status(500).send(
        '<pre style="white-space:pre-wrap;font-size:16px;">' +
        (err.stack || err.message || err) +
        '</pre>'
      );
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
        const carpetaAssets = path.resolve(
          sails.config.appPath,
          'assets',
          'demos',
          proyecto.carpetaDemo
        );

        const carpetaTmp = path.resolve(
          sails.config.appPath,
          '.tmp',
          'public',
          'demos',
          proyecto.carpetaDemo
        );

        eliminarCarpeta(carpetaAssets);
        eliminarCarpeta(carpetaTmp);
      }

      if (proyecto.carpetaRuntime) {
        const carpetaRuntime = path.resolve(
          sails.config.appPath,
          'deploy_runtime',
          'apps',
          proyecto.carpetaRuntime
        );

        eliminarCarpeta(carpetaRuntime);
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
    try {
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

    } catch (err) {
      console.log('================ ERROR LISTA DEPLOYS ================');
      console.error(err.stack || err);
      console.log('=====================================================');
      return res.serverError('Error al listar deploys.');
    }
  },

  estadoDeploy: async function (req, res) {
    try {
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

    } catch (err) {
      console.log('================ ERROR ESTADO DEPLOY ================');
      console.error(err.stack || err);
      console.log('=====================================================');
      return res.serverError('Error al consultar estado del deploy.');
    }
  }

};