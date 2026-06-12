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

  // 🚀 DemoFlow subida máxima 2GB

  return 2 * 1024 * 1024 * 1024;

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

  if (!fs.existsSync(carpetaDestino)) {
    return;
  }

  const indexDirecto = path.join(
    carpetaDestino,
    'index.html'
  );

  const appDirecto = path.join(
    carpetaDestino,
    'app.js'
  );

  const packageDirecto = path.join(
    carpetaDestino,
    'package.json'
  );

  // =========================
  // YA ESTÁ EN LA RAÍZ
  // =========================

  if (
    fs.existsSync(indexDirecto) ||
    fs.existsSync(appDirecto) ||
    fs.existsSync(packageDirecto)
  ) {

    sails.log.info(
      '✅ IA DemoFlow: Proyecto ya está en raíz:',
      carpetaDestino
    );

    return;
  }

  // =========================
  // BUSCAR ARCHIVO PRINCIPAL
  // =========================

  const appEncontrado =
    buscarArchivoRecursivo(
      carpetaDestino,
      'app.js'
    );

  const packageEncontrado =
    buscarArchivoRecursivo(
      carpetaDestino,
      'package.json'
    );

  const indexEncontrado =
    buscarArchivoRecursivo(
      carpetaDestino,
      'index.html'
    );

  const archivoBase =
    appEncontrado ||
    packageEncontrado ||
    indexEncontrado;

  if (!archivoBase) {

    sails.log.warn(
      '⚠️ IA DemoFlow: No se encontró app.js, package.json ni index.html.'
    );

    return;
  }

  // =========================
  // DETECTAR CARPETA REAL
  // =========================

  const carpetaReal =
    path.dirname(archivoBase);

  sails.log.info(
    '🧹 IA DemoFlow: Corrigiendo carpeta anidada...'
  );

  sails.log.info(
    '📁 Carpeta destino:',
    carpetaDestino
  );

  sails.log.info(
    '📁 Carpeta real detectada:',
    carpetaReal
  );

  // =========================
  // SI SON LA MISMA
  // NO HACER NADA
  // =========================

  if (
    path.resolve(carpetaReal) ===
    path.resolve(carpetaDestino)
  ) {

    sails.log.info(
      '✅ IA DemoFlow: No hay carpeta anidada.'
    );

    return;
  }

  // =========================
  // MOVER CONTENIDO
  // =========================

  const carpetaTemporal =
    carpetaDestino +
    '_tmp_' +
    Date.now();

  fs.renameSync(
    carpetaReal,
    carpetaTemporal
  );

  eliminarCarpeta(carpetaDestino);

  crearCarpeta(carpetaDestino);

  copiarCarpeta(
    carpetaTemporal,
    carpetaDestino
  );

  eliminarCarpeta(
    carpetaTemporal
  );

  sails.log.info(
    '✅ IA DemoFlow: Carpeta anidada corregida correctamente.'
  );

  sails.log.info(
    '📦 Contenido final:',
    fs.readdirSync(carpetaDestino)
  );

}

function clonarGitEnSegundoPlano(proyectoId, urlRepositorio, ramaGit, carpetaRuntimeFinal) {
  const carpetaDestinoRuntime =
    typeof DeployService !== 'undefined' &&
    DeployService.rutaRuntime
      ? DeployService.rutaRuntime(carpetaRuntimeFinal)
      : path.join(
          process.env.DEMOFLOW_STORAGE || sails.config.appPath,
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
      '🤖 DemoFlow inició clonación desde Git.\n' +
      `Repositorio: ${urlRepositorio}\n` +
      `Rama: ${rama}\n` +
      `Carpeta destino: ${carpetaDestinoRuntime}\n`
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
          `Carpeta destino: ${carpetaDestinoRuntime}\n` +
          log +
          `\n${error.message}`
      });

      return;
    }

    limpiarCarpetaExtra(carpetaDestinoRuntime);

    const tipoDetectado = detectarTipoIA(carpetaDestinoRuntime, 'node');

    let urlDemoFinal = null;
    let deployTypeFinal = 'dynamic';
    let estadoDeployFinal = 'subido';
    let carpetaDemoFinal = null;
    let carpetaRuntimeGuardar = carpetaRuntimeFinal;
    let puertoAsignado = null;
    let comandoInicio = null;
    let archivoEntrada = null;

    if (tipoDetectado === 'html') {
      carpetaDemoFinal = carpetaRuntimeFinal;

      publicarHtmlEnRender(
        carpetaDestinoRuntime,
        carpetaDemoFinal
      );

      urlDemoFinal = `/demos/${carpetaDemoFinal}/index.html`;
      deployTypeFinal = 'static';
      estadoDeployFinal = 'activo';
      carpetaRuntimeGuardar = null;
    }

    if (tipoDetectado === 'node' || tipoDetectado === 'sails') {
      puertoAsignado = generarPuerto();

      comandoInicio =
        tipoDetectado === 'sails'
          ? 'node app.js'
          : 'npm start';

      archivoEntrada = 'app.js';

      urlDemoFinal = `/runtime/${carpetaRuntimeFinal}`;
      deployTypeFinal = 'dynamic';
      estadoDeployFinal = 'subido';
    }

    await Proyecto.updateOne({ id: proyectoId }).set({
      tipoProyecto: tipoDetectado,
      carpetaDemo: carpetaDemoFinal,
      carpetaRuntime: carpetaRuntimeGuardar,
      puerto: puertoAsignado,
      deployType: deployTypeFinal,
      estadoDeploy: estadoDeployFinal,
      urlDemo: urlDemoFinal,
      comandoInicio,
      archivoEntrada,
      logDeploy:
        '✅ Repositorio Git clonado correctamente.\n' +
        `Tipo detectado: ${tipoDetectado}\n` +
        `Carpeta clonada: ${carpetaDestinoRuntime}\n` +
        `URL DemoFlow: ${urlDemoFinal}\n` +
        (
          tipoDetectado === 'html'
            ? `✅ HTML publicado en /demos/${carpetaDemoFinal}/index.html\n`
            : `✅ Puerto asignado: ${puertoAsignado}\n✅ Comando sugerido: ${comandoInicio}\n`
        ) +
        'Listo.\n' +
        log
    });
  });
}

module.exports = {

  index: async function (req, res) {
  try {

    const proyectos = await Proyecto.find({
      activo: true
    }).sort('id DESC');

    // =====================================
    // 👤 USUARIO COMPLETO PARA NAVBAR
    // =====================================

    let usuario = null;

    if (req.session && req.session.userId) {
      usuario = await Usuario.findOne({
        id: req.session.userId
      });
    }

    return res.view('pages/homepage', {
      titulo: 'Inicio',
      proyectos,
      usuario
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

    const usuario = await Usuario.findOne({
      id: req.session.userId
    });

    if (!usuario) {
      return res.redirect('/login');
    }

    const proyectos = await Proyecto.find({
      usuario: req.session.userId
    }).sort('id DESC');

    return res.view('pages/dashboard/index', {
      titulo: 'Dashboard',
      proyectos,
      usuario,
      iaDashboard: null
    });

  } catch (err) {
    console.log('================ ERROR DASHBOARD ================');
    console.error(err.stack || err);
    console.log('================================================');

    return res.status(500).send(
      '<pre style="white-space:pre-wrap;font-size:16px;">' +
      (err.stack || err.message || err) +
      '</pre>'
    );
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

    const usuarioActual = await Usuario.findOne({
      id: req.session.userId
    });

    if (!usuarioActual) {
      sails.log.warn('🤖 IA DemoFlow: Usuario no encontrado en sesión.');
      return res.redirect('/login');
    }

    if ((usuarioActual.creditos || 0) <= 0) {
      sails.log.warn('🚫 IA DemoFlow: Usuario sin créditos para publicar demo.');
      return res.redirect('/premium');
    }

    sails.log.info('💎 IA DemoFlow: Créditos disponibles:', usuarioActual.creditos);

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

    // =====================================
    // 🌐 URL EXTERNA
    // =====================================

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
      logDeploy = '🤖 IA DemoFlow registró una URL externa correctamente.';
    }

    // =====================================
    // 🧬 GIT
    // =====================================

    else if (metodoEntrada === 'git') {
      if (!urlRepositorio) {
        return res.badRequest('La URL del repositorio es obligatoria para importar desde Git.');
      }

      tipoFinal = tipoProyecto === 'externo' ? 'node' : tipoProyecto;
      deployType = tipoFinal === 'html' ? 'static' : 'dynamic';
      estadoDeploy = 'subido';

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

        comandoInicioFinal =
          comandoInicio ||
          (tipoFinal === 'sails' ? 'node app.js' : 'npm start');

        archivoEntradaFinal =
          archivoEntrada || 'app.js';

        urlDemoFinal =
          `/runtime/${carpetaRuntimeFinal}`;

        logDeploy =
          '🤖 IA DemoFlow registró repositorio Git dinámico.\n' +
          `Repositorio: ${urlRepositorio}\n` +
          `Rama: ${ramaGit || 'main'}\n` +
          `✅ Runtime preparado: ${carpetaRuntimeFinal}\n` +
          `✅ Puerto asignado: ${puertoFinal}\n` +
          `✅ URL runtime: ${urlDemoFinal}\n` +
          `✅ Comando sugerido: ${comandoInicioFinal}\n` +
          'Clonación iniciará en segundo plano.';
      }

      else if (tipoFinal === 'html') {
        carpetaDemoFinal = limpiarTextoRuta(carpetaDemoIngresada || slugFinal);
        urlDemoFinal = urlDemoIngresada || `/demos/${carpetaDemoFinal}/index.html`;

        logDeploy =
          '🤖 IA DemoFlow registró repositorio Git HTML.\n' +
          `Repositorio: ${urlRepositorio}\n` +
          `Rama: ${ramaGit || 'main'}\n` +
          `📁 Carpeta demo: ${carpetaDemoFinal}\n` +
          `🌐 URL esperada: ${urlDemoFinal}\n`;
      }

      if (urlDemoIngresada) {
        urlDemoFinal = urlDemoIngresada;
        estadoDeploy = 'activo';
        logDeploy = '🤖 IA DemoFlow registró repositorio Git con URL en vivo.';
      }
    }

    // =====================================
    // 📦 ZIP / HTML / CARPETA SAILS
    // =====================================

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
          await fs
            .createReadStream(archivoSubido.fd)
            .pipe(unzipper.Extract({ path: carpetaTemporalIA }))
            .promise();

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
            `✅ URL generada: ${urlDemoFinal}\n`;
        }

        else if (tipoFinal === 'node' || tipoFinal === 'sails') {
          carpetaRuntimeFinal = slugFinal;

          const carpetaDestinoRuntime =
            typeof DeployService !== 'undefined' &&
            DeployService.rutaRuntime
              ? DeployService.rutaRuntime(carpetaRuntimeFinal)
              : path.join(
                  process.env.DEMOFLOW_STORAGE || sails.config.appPath,
                  'deploy_runtime',
                  'apps',
                  carpetaRuntimeFinal
                );

          eliminarCarpeta(carpetaDestinoRuntime);
          crearCarpeta(carpetaDestinoRuntime);

          await ZipBuilderService.crearZipInteligente({
            carpetaOrigen: carpetaTemporalIA,
            nombreProyecto: slugFinal
          });

          limpiarCarpetaExtra(carpetaTemporalIA);

          sails.log.info(
            '📁 IA TEMP después de limpiar:',
            fs.readdirSync(carpetaTemporalIA)
          );

          copiarCarpeta(
            carpetaTemporalIA,
            carpetaDestinoRuntime
          );

          sails.log.info(
            '✅ IA DemoFlow: Carpeta copiada al runtime:',
            carpetaDestinoRuntime
          );

          sails.log.info(
            '📁 IA DemoFlow: Existe carpeta runtime:',
            fs.existsSync(carpetaDestinoRuntime)
          );

          if (fs.existsSync(carpetaDestinoRuntime)) {
            sails.log.info(
              '📦 IA DemoFlow: Archivos raíz en runtime:',
              fs.readdirSync(carpetaDestinoRuntime)
            );
          }

          puertoFinal = generarPuerto();

          comandoInicioFinal =
            comandoInicio ||
            (tipoFinal === 'sails' ? 'node app.js' : 'npm start');

          archivoEntradaFinal =
            archivoEntrada || 'app.js';

          deployType = 'dynamic';
          estadoDeploy = 'subido';
          urlDemoFinal = `/runtime/${carpetaRuntimeFinal}`;

          logDeploy =
            `🤖 DemoFlow IA detectó proyecto ${tipoFinal} desde carpeta/ZIP.\n` +
            `✅ Runtime preparado: ${carpetaRuntimeFinal}\n` +
            `✅ Carpeta runtime: ${carpetaDestinoRuntime}\n` +
            `✅ Puerto asignado: ${puertoFinal}\n` +
            `✅ URL runtime: ${urlDemoFinal}\n` +
            `✅ Comando sugerido: ${comandoInicioFinal}\n` +
            `✅ Archivo de entrada: ${archivoEntradaFinal}\n` +
            'Pendiente desplegar desde el panel.';
        }

        eliminarCarpeta(carpetaTemporalIA);
      }
    }

    else {
      return res.badRequest(`Método de entrada no válido: ${metodoEntrada}`);
    }

    // =====================================
    // ✅ CREAR PROYECTO
    // =====================================

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

    await Usuario.updateOne({
      id: usuarioActual.id
    }).set({
      creditos: usuarioActual.creditos - 1
    });

    sails.log.info(
      `💎 IA DemoFlow: Crédito descontado. Restantes: ${usuarioActual.creditos - 1}`
    );

    if (metodoEntrada === 'git' && urlRepositorio && !urlDemoIngresada) {
      clonarGitEnSegundoPlano(
        proyectoCreado.id,
        urlRepositorio,
        ramaGit,
        carpetaRuntimeFinal || carpetaDemoFinal || slugFinal
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

analizarIA: async function(req, res) {

  try {

    // =====================================
    // 🔐 VALIDAR SESIÓN
    // =====================================

    if (!req.session.userId) {

      return res.status(401).json({
        ok: false,
        mensaje: 'Sesión no válida.'
      });

    }

    const usuario = await Usuario.findOne({
      id: req.session.userId
    });

    if (!usuario) {

      return res.status(401).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });

    }

    // =====================================
    // 💎 VALIDAR CRÉDITOS IA
    // =====================================

    if ((usuario.creditos || 0) <= 0) {

      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes créditos IA disponibles.'
      });

    }

    // =====================================
    // 📦 BUSCAR PROYECTO
    // =====================================

    const proyecto = await Proyecto.findOne({

      id: req.params.id,

      usuario: req.session.userId

    });

    if (!proyecto) {

      return res.status(404).json({
        ok: false,
        mensaje: 'Proyecto no encontrado.'
      });

    }

    // =====================================
    // 📁 DETECTAR RUTA
    // =====================================

    let rutaProyecto = null;

    if (proyecto.carpetaRuntime) {

      rutaProyecto =
  typeof DeployService !== 'undefined' &&
  DeployService.rutaRuntime
    ? DeployService.rutaRuntime(proyecto.carpetaRuntime)
    : path.join(
        process.env.DEMOFLOW_STORAGE || sails.config.appPath,
        'deploy_runtime',
        'apps',
        proyecto.carpetaRuntime
      );

    }

    if (
      !rutaProyecto &&
      proyecto.carpetaDemo
    ) {

      rutaProyecto = path.resolve(

        sails.config.appPath,

        'assets',

        'demos',

        proyecto.carpetaDemo

      );

    }

    // =====================================
    // 🤖 RESULTADO IA BASE
    // =====================================

    let resultadoIA = {

      tecnologia:
        proyecto.tecnologia || 'Demo externa',

      listoParaDeploy: true,

      recomendaciones: [

        'Proyecto registrado correctamente en DemoFlow.',

        'La IA recomienda mantener una estructura organizada.',

        'El proyecto puede escalar como SaaS.'

      ],

      errores: []

    };

    // =====================================
    // 🧠 ANALIZAR CON IA
    // =====================================

    if (
      rutaProyecto &&
      fs.existsSync(rutaProyecto)
    ) {

      try {

        resultadoIA =
          await IAAnalyzerService.analizarProyecto(
            rutaProyecto
          );

      } catch (errorIA) {

        sails.log.error(
          '❌ Error IAAnalyzerService:'
        );

        sails.log.error(errorIA);

        resultadoIA.errores.push(
          'La IA no pudo analizar completamente el proyecto.'
        );

      }

    } else {

      resultadoIA.recomendaciones.push(

        'DemoFlow IA no encontró carpeta local. Posiblemente es una demo externa.'

      );

    }

    // =====================================
    // 📝 LOG IA
    // =====================================

    const logIA =

      '\n\n================ 🤖 ANÁLISIS IA DEMOFLOW ================\n' +

      `Fecha: ${new Date().toLocaleString('es-CO')}\n` +

      `Proyecto: ${proyecto.nombre}\n` +

      `Tecnología detectada: ${resultadoIA.tecnologia || 'desconocida'}\n` +

      `Listo para deploy: ${resultadoIA.listoParaDeploy ? 'SI' : 'NO'}\n\n` +

      'Recomendaciones:\n' +

      (resultadoIA.recomendaciones || [])

        .map(r => `✅ ${r}`)

        .join('\n') +

      '\n\nErrores detectados:\n' +

      (
        resultadoIA.errores &&
        resultadoIA.errores.length > 0
      )

        ? resultadoIA.errores
            .map(e => `❌ ${e}`)
            .join('\n')

        : '✅ No se detectaron errores críticos.' +

      '\n=========================================================\n';

    // =====================================
    // 💾 GUARDAR LOG
    // =====================================

    await Proyecto.updateOne({
      id: proyecto.id
    }).set({

      logDeploy:
        (proyecto.logDeploy || '') + logIA

    });

    // =====================================
    // 💎 DESCONTAR CRÉDITO
    // =====================================

    await Usuario.updateOne({
      id: usuario.id
    }).set({

      creditos:
        usuario.creditos - 1

    });

    sails.log.info(

      `🤖 IA DemoFlow: Análisis completado. Créditos restantes: ${usuario.creditos - 1}`

    );

    // =====================================
    // ✅ RESPUESTA JSON
    // =====================================

    return res.json({

      ok: true,

      mensaje:
        'DemoFlow IA completó el análisis correctamente.',

      resultadoIA,

      creditosRestantes:
        usuario.creditos - 1

    });

  } catch (err) {

    sails.log.error(
      '❌ IA DemoFlow: Error analizando proyecto.'
    );

    sails.log.error(err);

    return res.status(500).json({

      ok: false,

      mensaje:
        'Error interno analizando proyecto con IA.',

      error:
        err.message || err

    });

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

    // =====================================
    // 👤 USUARIO COMPLETO PARA NAVBAR / VISTA
    // =====================================

    let usuario = null;

    if (req.session && req.session.userId) {
      usuario = await Usuario.findOne({
        id: req.session.userId
      });
    }

    // =====================================
    // ⚡ VERIFICAR RUNTIME REAL EN TIEMPO REAL
    // =====================================

    let runtimeOnline = false;

    if (proyecto && proyecto.puerto) {
      try {
        const health = await RuntimeHealthService.revisarRuntime(proyecto);
        runtimeOnline = !!(health && health.ok);
      } catch (healthError) {
        sails.log.warn('⚠️ IA DemoFlow: No se pudo verificar runtime en detalle.');
        sails.log.warn(healthError.message);
        runtimeOnline = false;
      }
    }

    return res.view('pages/ver', {
      titulo: proyecto.nombre,
      proyecto,
      usuario,
      runtimeOnline
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

    const usuarioLogueado = await Usuario.findOne({
      id: req.session.userId
    });

    if (!usuarioLogueado) {
      return res.forbidden('Usuario no autorizado.');
    }

    const propietarioId =
      proyecto.usuario && typeof proyecto.usuario === 'object'
        ? proyecto.usuario.id
        : proyecto.usuario;

    const esDueno =
      String(propietarioId || '') === String(req.session.userId || '');

    const esAdmin =
      usuarioLogueado.rol === 'admin' ||
      usuarioLogueado.role === 'admin' ||
      usuarioLogueado.email === 'jf@gmail.com';

    if (!esDueno && !esAdmin && propietarioId) {
      return res.forbidden('No tienes permiso para eliminar este proyecto.');
    }

    const slugRuntime = proyecto.carpetaRuntime || proyecto.slug;
    const nombrePm2 = slugRuntime ? 'demoflow-' + slugRuntime : null;

    if (nombrePm2) {
      try {
        const { exec } = require('child_process');

        await new Promise((resolve) => {
          exec(`pm2 delete "${nombrePm2}" || true`, function () {
            return resolve();
          });
        });

        sails.log.info('✅ IA DemoFlow: PM2 eliminado:', nombrePm2);
      } catch (e) {
        sails.log.warn('⚠️ IA DemoFlow: No se pudo detener PM2:', e.message);
      }
    }

    try {
      if (typeof ProyectoRuntime !== 'undefined') {
        await ProyectoRuntime.destroy({
          proyecto: proyecto.id
        });
      }
    } catch (e) {
      sails.log.warn(
        '⚠️ IA DemoFlow: No se pudo eliminar ProyectoRuntime:',
        e.message
      );
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
      const carpetaRuntime =
        typeof DeployService !== 'undefined' &&
        DeployService.rutaRuntime
          ? DeployService.rutaRuntime(proyecto.carpetaRuntime)
          : path.join(
              process.env.DEMOFLOW_STORAGE || sails.config.appPath,
              'deploy_runtime',
              'apps',
              proyecto.carpetaRuntime
            );

      eliminarCarpeta(carpetaRuntime);

      sails.log.info('✅ IA DemoFlow: Carpeta runtime eliminada:', carpetaRuntime);
    }

    await Proyecto.destroyOne({
      id: proyecto.id
    });

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