const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

const procesos = {};

function puertoAleatorio() {
  return Math.floor(4100 + Math.random() * 900);
}

async function validarPermiso(req, proyecto) {
  const usuarioLogueado = await Usuario.findOne({ id: req.session.userId });

  if (!usuarioLogueado) {
    return false;
  }

  const propietarioId = typeof proyecto.usuario === 'object' && proyecto.usuario !== null
    ? proyecto.usuario.id
    : proyecto.usuario;

  const esDueno = Number(propietarioId) === Number(req.session.userId);
  const esAdmin = usuarioLogueado.rol === 'admin';

  return esDueno || esAdmin;
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

    const comandoInicio = proyecto.comandoInicio && proyecto.comandoInicio.trim() !== ''
      ? proyecto.comandoInicio.trim()
      : (proyecto.tipoProyecto === 'sails' ? 'node app.js' : 'npm start');

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
      console.log('================ ERROR ESTADO DEPLOY ================');
      console.error(err.stack || err);
      console.log('=====================================================');
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

      const carpetaRuntime = proyecto.carpetaRuntime || proyecto.slug;

      const rutaLog = path.resolve(
        sails.config.appPath,
        'deploy_runtime',
        'logs',
        `${carpetaRuntime}.log`
      );

      let contenidoLog = proyecto.logDeploy || 'Sin logs todavía.';

      if (fs.existsSync(rutaLog)) {
        contenidoLog = fs.readFileSync(rutaLog, 'utf8');
      }

      return res.view('pages/proyecto/logs', {
        titulo: `Logs - ${proyecto.nombre}`,
        proyecto,
        contenidoLog,
        usuario: {
          id: req.session.userId,
          nombre: req.session.userName,
          email: req.session.userEmail
        }
      });

    } catch (err) {
      console.log('================ ERROR LOGS DEPLOY ================');
      console.error(err.stack || err);
      console.log('===================================================');
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
        await Proyecto.updateOne({ id: proyecto.id }).set({
          deployType: 'static',
          estadoDeploy: 'activo',
          logDeploy: 'Proyecto HTML publicado correctamente.'
        });

        return res.redirect('/dashboard');
      }

      if (!esBackend) {
        await Proyecto.updateOne({ id: proyecto.id }).set({
          estadoDeploy: 'activo',
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

      if (proyecto.tipoProyecto !== 'node' && proyecto.tipoProyecto !== 'sails') {
        return res.redirect('/dashboard');
      }

      await levantarProyecto(proyecto);
      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR INICIAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('========================================================');
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
      console.log('================ ERROR DETENER PROYECTO ================');
      console.error(err.stack || err);
      console.log('========================================================');
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

      await levantarProyecto(proyecto);
      return res.redirect('/dashboard');

    } catch (err) {
      console.log('================ ERROR REINICIAR PROYECTO ================');
      console.error(err.stack || err);
      console.log('==========================================================');
      return res.serverError('Error al reiniciar el proyecto.');
    }
  }

};