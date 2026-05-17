const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec, spawn } = require('child_process');
const unzipper = require('unzipper');

const procesos = {};

function puertoAleatorio() {
  return Math.floor(4100 + Math.random() * 900);
}

function limpiarNombre(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function existe(ruta) {
  try {
    await fsp.access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function buscarIndexHtml(carpeta) {
  const entradas = await fsp.readdir(carpeta, { withFileTypes: true });

  for (const entrada of entradas) {
    if (entrada.isFile() && entrada.name.toLowerCase() === 'index.html') {
      return path.join(carpeta, entrada.name);
    }
  }

  for (const entrada of entradas) {
    if (entrada.isDirectory()) {
      const encontrado = await buscarIndexHtml(path.join(carpeta, entrada.name));
      if (encontrado) return encontrado;
    }
  }

  return null;
}

async function copiarContenido(origen, destino) {
  await fsp.mkdir(destino, { recursive: true });

  const entradas = await fsp.readdir(origen, { withFileTypes: true });

  for (const entrada of entradas) {
    const rutaOrigen = path.join(origen, entrada.name);
    const rutaDestino = path.join(destino, entrada.name);

    if (entrada.isDirectory()) {
      await copiarContenido(rutaOrigen, rutaDestino);
    } else {
      await fsp.copyFile(rutaOrigen, rutaDestino);
    }
  }
}

async function eliminarCarpeta(ruta) {
  if (await existe(ruta)) {
    await fsp.rm(ruta, { recursive: true, force: true });
  }
}

async function publicarHtml(proyecto) {
  const carpetaDemo = limpiarNombre(proyecto.carpetaDemo || proyecto.slug);
  const carpetaPublica = path.resolve(
    sails.config.appPath,
    '.tmp',
    'public',
    'demos',
    carpetaDemo
  );

  const carpetaTemporal = path.resolve(
    sails.config.appPath,
    '.tmp',
    'demoflow-temp',
    `${carpetaDemo}-${Date.now()}`
  );

  await eliminarCarpeta(carpetaPublica);
  await eliminarCarpeta(carpetaTemporal);

  await fsp.mkdir(carpetaPublica, { recursive: true });
  await fsp.mkdir(carpetaTemporal, { recursive: true });

  const posibleZip = proyecto.archivoZipOriginal || proyecto.archivo_html_zip || proyecto.archivoDemo;

  if (!posibleZip) {
    throw new Error('No se encontró archivo ZIP registrado en el proyecto.');
  }

  const rutasPosibles = [
    path.resolve(sails.config.appPath, posibleZip),
    path.resolve(sails.config.appPath, '.tmp', 'uploads', posibleZip),
    path.resolve(sails.config.appPath, 'uploads', posibleZip),
    path.resolve(sails.config.appPath, 'assets', 'uploads', posibleZip)
  ];

  let rutaZip = null;

  for (const ruta of rutasPosibles) {
    if (await existe(ruta)) {
      rutaZip = ruta;
      break;
    }
  }

  if (!rutaZip) {
    throw new Error('No se encontró el ZIP físico en el servidor.');
  }

  if (rutaZip.toLowerCase().endsWith('.html') || rutaZip.toLowerCase().endsWith('.htm')) {
    await fsp.copyFile(rutaZip, path.join(carpetaPublica, 'index.html'));
  } else {
    await fs.createReadStream(rutaZip)
      .pipe(unzipper.Extract({ path: carpetaTemporal }))
      .promise();

    const indexEncontrado = await buscarIndexHtml(carpetaTemporal);

    if (!indexEncontrado) {
      throw new Error('El ZIP no contiene index.html.');
    }

    const carpetaReal = path.dirname(indexEncontrado);

    await copiarContenido(carpetaReal, carpetaPublica);
  }

  await eliminarCarpeta(carpetaTemporal);

  const urlFinal = `/demos/${carpetaDemo}/index.html`;

  await Proyecto.updateOne({ id: proyecto.id }).set({
    carpetaDemo,
    deployType: 'static',
    estadoDeploy: 'activo',
    urlDemo: urlFinal,
    logDeploy:
      '✅ Proyecto HTML publicado correctamente.\n' +
      `📁 Carpeta pública: ${carpetaDemo}\n` +
      `🌐 URL: ${urlFinal}\n` +
      '🤖 DemoFlow detectó automáticamente el index.html y organizó el contenido.'
  });

  return urlFinal;
}

async function validarPermiso(req, proyecto) {
  const usuarioLogueado = await Usuario.findOne({ id: req.session.userId });

  if (!usuarioLogueado) return false;

  const propietarioId =
    typeof proyecto.usuario === 'object' && proyecto.usuario !== null
      ? proyecto.usuario.id
      : proyecto.usuario;

  return Number(propietarioId) === Number(req.session.userId) || usuarioLogueado.rol === 'admin';
}

async function levantarProyecto(proyecto) {
  const id = proyecto.id;
  const carpetaRuntime = proyecto.carpetaRuntime || proyecto.slug;

  const rutaProyecto = path.resolve(
    sails.config.appPath,
    'deploy_runtime',
    'apps',
    carpetaRuntime
  );

  if (!fs.existsSync(rutaProyecto)) {
    await Proyecto.updateOne({ id }).set({
      estadoDeploy: 'fallido',
      logDeploy: 'No existe la carpeta runtime del proyecto.'
    });
    return;
  }

  const puerto = proyecto.puerto || puertoAleatorio();

  await Proyecto.updateOne({ id }).set({
    puerto,
    estadoDeploy: 'instalando',
    logDeploy: 'Ejecutando npm install...'
  });

  exec('npm install', { cwd: rutaProyecto }, async function (error, stdout, stderr) {
    let log = '';

    if (stdout) log += `\n[STDOUT]\n${stdout}`;
    if (stderr) log += `\n[STDERR]\n${stderr}`;

    const rutaLogs = path.resolve(sails.config.appPath, 'deploy_runtime', 'logs');

    if (!fs.existsSync(rutaLogs)) {
      fs.mkdirSync(rutaLogs, { recursive: true });
    }

    const archivoLog = path.resolve(rutaLogs, `${carpetaRuntime}.log`);
    fs.writeFileSync(archivoLog, log, 'utf8');

    if (error) {
      await Proyecto.updateOne({ id }).set({
        estadoDeploy: 'fallido',
        logDeploy: `Fallo en npm install.\n${log || error.message}`
      });
      return;
    }

    const comandoInicio =
      proyecto.comandoInicio && proyecto.comandoInicio.trim() !== ''
        ? proyecto.comandoInicio.trim()
        : proyecto.tipoProyecto === 'sails'
          ? 'node app.js'
          : 'npm start';

    const partes = comandoInicio.split(' ');
    const comando = partes[0];
    const args = partes.slice(1);

    const proceso = spawn(comando, args, {
      cwd: rutaProyecto,
      shell: true,
      env: {
        ...process.env,
        PORT: String(puerto),
        NODE_ENV: 'production'
      }
    });

    procesos[id] = proceso;

    let logRuntime = log + `\n\n[DEMOFLOW]\nIniciando app con: ${comandoInicio}\nPuerto: ${puerto}\n`;

    proceso.stdout.on('data', async function (data) {
      logRuntime += `\n[APP]\n${data.toString()}`;
      fs.writeFileSync(archivoLog, logRuntime, 'utf8');
      await Proyecto.updateOne({ id }).set({ logDeploy: logRuntime });
    });

    proceso.stderr.on('data', async function (data) {
      logRuntime += `\n[ERROR]\n${data.toString()}`;
      fs.writeFileSync(archivoLog, logRuntime, 'utf8');
      await Proyecto.updateOne({ id }).set({ logDeploy: logRuntime });
    });

    proceso.on('exit', async function (code) {
      logRuntime += `\n[DEMOFLOW]\nProceso detenido. Código: ${code}\n`;
      fs.writeFileSync(archivoLog, logRuntime, 'utf8');

      await Proyecto.updateOne({ id }).set({
        estadoDeploy: 'detenido',
        logDeploy: logRuntime
      });
    });

    await Proyecto.updateOne({ id }).set({
      estadoDeploy: 'activo',
      puerto,
      urlDemo: `http://localhost:${puerto}`,
      logDeploy: logRuntime
    });
  });
}

module.exports = {
  estado: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para ver este despliegue.');

      return res.view('pages/deploy/estado', {
        titulo: `Estado deploy - ${proyecto.nombre}`,
        proyecto,
        usuario: {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        }
      });
    } catch (err) {
      console.error(err);
      return res.serverError('Error al consultar el estado del despliegue.');
    }
  },

  logs: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para ver los logs.');

      return res.view('pages/proyecto/logs', {
        titulo: `Logs - ${proyecto.nombre}`,
        proyecto,
        contenidoLog: proyecto.logDeploy || 'Sin logs todavía.',
        usuario: {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        }
      });
    } catch (err) {
      console.error(err);
      return res.serverError('Error al leer los logs del despliegue.');
    }
  },

  desplegar: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para desplegar este proyecto.');

      const esHtml = proyecto.tipoProyecto === 'html';
      const esBackend = proyecto.tipoProyecto === 'node' || proyecto.tipoProyecto === 'sails';

      if (esHtml) {
        await publicarHtml(proyecto);
        return res.redirect('/dashboard');
      }

      if (!esBackend) {
        await Proyecto.updateOne({ id: proyecto.id }).set({
          estadoDeploy: 'activo',
          deployType: 'external',
          logDeploy: 'Proyecto externo marcado como activo.'
        });

        return res.redirect('/dashboard');
      }

      await levantarProyecto(proyecto);
      return res.redirect('/dashboard');
    } catch (err) {
      console.log('================ ERROR DESPLEGAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('==========================================================');

      await Proyecto.updateOne({ id: req.params.id }).set({
        estadoDeploy: 'fallido',
        logDeploy: `❌ Error al desplegar:\n${err.message}`
      }).catch(() => {});

      return res.serverError('Error al iniciar el despliegue.');
    }
  },

  iniciar: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para iniciar este proyecto.');

      if (proyecto.tipoProyecto === 'html') {
        await publicarHtml(proyecto);
        return res.redirect('/dashboard');
      }

      if (proyecto.tipoProyecto !== 'node' && proyecto.tipoProyecto !== 'sails') {
        return res.redirect('/dashboard');
      }

      await levantarProyecto(proyecto);
      return res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      return res.serverError('Error iniciando proyecto.');
    }
  },

  detener: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para detener este proyecto.');

      const id = proyecto.id;

      if (procesos[id]) {
        procesos[id].kill();
        delete procesos[id];
      }

      await Proyecto.updateOne({ id }).set({
        estadoDeploy: 'detenido',
        logDeploy: (proyecto.logDeploy || '') + '\nProyecto detenido manualmente.'
      });

      return res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      return res.serverError('Error al detener el proyecto.');
    }
  },

  reiniciar: async function (req, res) {
    try {
      if (!req.session.userId) return res.redirect('/login');

      const proyecto = await Proyecto.findOne({ id: req.params.id });
      if (!proyecto) return res.notFound('Proyecto no encontrado.');

      const permitido = await validarPermiso(req, proyecto);
      if (!permitido) return res.forbidden('No tienes permiso para reiniciar este proyecto.');

      if (procesos[proyecto.id]) {
        procesos[proyecto.id].kill();
        delete procesos[proyecto.id];
      }

      if (proyecto.tipoProyecto === 'html') {
        await publicarHtml(proyecto);
        return res.redirect('/dashboard');
      }

      await levantarProyecto(proyecto);
      return res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      return res.serverError('Error al reiniciar el proyecto.');
    }
  }
};