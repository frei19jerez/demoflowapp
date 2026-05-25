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

  const rutaLogs = path.resolve(
    sails.config.appPath,
    'deploy_runtime',
    'logs'
  );

  if (!fs.existsSync(rutaLogs)) {
    fs.mkdirSync(rutaLogs, { recursive: true });
  }

  const archivoLog = path.resolve(
    rutaLogs,
    `${carpetaRuntime}.log`
  );

  if (!fs.existsSync(rutaProyecto)) {

    if (!proyecto.urlRepositorio) {

      const msg =
        '❌ IA DemoFlow detectó un problema:\n' +
        'No existe la carpeta runtime y el proyecto no tiene repositorio Git.\n\n' +
        `📁 Ruta esperada:\n${rutaProyecto}\n`;

      fs.writeFileSync(archivoLog, msg, 'utf8');

      await Proyecto.updateOne({ id }).set({
        estadoDeploy: 'fallido',
        urlDemo: null,
        logDeploy: msg
      });

      return;
    }

    fs.mkdirSync(path.dirname(rutaProyecto), {
      recursive: true
    });

    let logClone =
      '🚀 DemoFlow Deploy\n' +
      '🤖 IA DemoFlow: No encontré la carpeta runtime.\n' +
      '📥 Clonando repositorio desde GitHub...\n\n' +
      `🔗 Repo: ${proyecto.urlRepositorio}\n` +
      `📁 Destino: ${rutaProyecto}\n`;

    fs.writeFileSync(archivoLog, logClone, 'utf8');

    await Proyecto.updateOne({ id }).set({
      estadoDeploy: 'clonando',
      logDeploy: logClone
    });

    await new Promise((resolve) => {

      exec(
        `git clone --branch "${proyecto.rama || 'main'}" "${proyecto.urlRepositorio}" "${rutaProyecto}"`,
        {
          timeout: 120000,
          maxBuffer: 1024 * 1024 * 10
        },

        async function(cloneError, cloneStdout, cloneStderr) {

          if (cloneStdout) {
            logClone += `\n[STDOUT git clone]\n${cloneStdout}`;
          }

          if (cloneStderr) {
            logClone += `\n[STDERR git clone]\n${cloneStderr}`;
          }

          if (cloneError) {

            logClone +=
              '\n❌ IA DemoFlow: No pude clonar el repositorio.\n' +
              `🧠 Error:\n${cloneError.message}\n`;

            fs.writeFileSync(archivoLog, logClone, 'utf8');

            await Proyecto.updateOne({ id }).set({
              estadoDeploy: 'fallido',
              urlDemo: null,
              logDeploy: logClone
            });

            return resolve(false);
          }

          logClone +=
            '\n✅ Repositorio clonado correctamente.\n' +
            '🤖 IA DemoFlow: Continuando instalación.\n';

          fs.writeFileSync(archivoLog, logClone, 'utf8');

          await Proyecto.updateOne({ id }).set({
            estadoDeploy: 'instalando',
            logDeploy: logClone
          });

          return resolve(true);
        }
      );

    });

    if (!fs.existsSync(rutaProyecto)) {
      return;
    }
  }

  const puerto = proyecto.puerto || puertoAleatorio();
  const urlDemo = `/runtime/${carpetaRuntime}`;
  const urlCompleta = `https://demoflowapp.com${urlDemo}`;
  const nombrePm2 = carpetaRuntime;

  const pm2Bin = path.resolve(
    sails.config.appPath,
    'node_modules',
    '.bin',
    process.platform === 'win32'
      ? 'pm2.cmd'
      : 'pm2'
  );

  let logRuntime =
    '🚀 DemoFlow Deploy\n' +
    '🤖 IA DemoFlow: Preparando runtime...\n\n' +
    `📁 Carpeta: ${rutaProyecto}\n` +
    `🔌 Puerto: ${puerto}\n` +
    `🌐 URL: ${urlCompleta}\n\n` +
    '📦 Instalando dependencias...\n';

  fs.writeFileSync(archivoLog, logRuntime, 'utf8');

  await Proyecto.updateOne({ id }).set({
    puerto,
    urlDemo,
    estadoDeploy: 'instalando',
    logDeploy: logRuntime
  });

  exec(
    'npm install --no-audit --no-fund',
    {
      cwd: rutaProyecto,
      timeout: 300000,
      maxBuffer: 1024 * 1024 * 10
    },

    async function(error, stdout, stderr) {

      if (stdout) {
        logRuntime += `\n[STDOUT npm install]\n${stdout}`;
      }

      if (stderr) {
        logRuntime += `\n[STDERR npm install]\n${stderr}`;
      }

      if (error) {

        logRuntime +=
          '\n❌ npm install falló.\n' +
          `🧠 Error:\n${error.message}\n`;

        fs.writeFileSync(archivoLog, logRuntime, 'utf8');

        await Proyecto.updateOne({ id }).set({
          estadoDeploy: 'fallido',
          logDeploy: logRuntime
        });

        return;
      }

      const comandoInicio =
        proyecto.comandoInicio &&
        proyecto.comandoInicio.trim() !== ''
          ? proyecto.comandoInicio.trim()
          : proyecto.tipoProyecto === 'sails'
            ? 'node app.js'
            : 'npm start';

      const appJsPath = path.resolve(
        rutaProyecto,
        'app.js'
      );

      if (
        comandoInicio.includes('app.js') &&
        !fs.existsSync(appJsPath)
      ) {

        logRuntime +=
          '\n❌ No encontré app.js en el runtime.\n' +
          `📁 Ruta buscada:\n${appJsPath}\n`;

        fs.writeFileSync(archivoLog, logRuntime, 'utf8');

        await Proyecto.updateOne({ id }).set({
          estadoDeploy: 'fallido',
          logDeploy: logRuntime
        });

        return;
      }

      let comandoPm2;

      if (comandoInicio.startsWith('node ')) {

        const archivo =
          comandoInicio.replace('node ', '').trim() || 'app.js';

        comandoPm2 =
          `export DATABASE_URL="${process.env.DATABASE_URL || ''}" && ` +
          `"${pm2Bin}" delete "${nombrePm2}" || true && ` +
          `PORT=${puerto} sails_port=${puerto} NODE_ENV=production ` +
          `"${pm2Bin}" start "${archivo}" --name "${nombrePm2}" --update-env`;

      } else {

        comandoPm2 =
          `export DATABASE_URL="${process.env.DATABASE_URL || ''}" && ` +
          `"${pm2Bin}" delete "${nombrePm2}" || true && ` +
          `PORT=${puerto} sails_port=${puerto} NODE_ENV=production ` +
          `"${pm2Bin}" start npm --name "${nombrePm2}" -- start`;

      }

      logRuntime +=
        '\n✅ Dependencias instaladas.\n' +
        `🚀 Iniciando runtime:\n${comandoInicio}\n` +
        `🔐 DATABASE_URL: ${process.env.DATABASE_URL ? 'detectada' : 'NO detectada'}\n` +
        `🔌 PORT: ${puerto}\n`;

      fs.writeFileSync(archivoLog, logRuntime, 'utf8');

      await Proyecto.updateOne({ id }).set({
        estadoDeploy: 'iniciando',
        logDeploy: logRuntime
      });

      exec(
        comandoPm2,
        {
          cwd: rutaProyecto,
          timeout: 60000,
          maxBuffer: 1024 * 1024 * 10
        },

        async function(pm2Error, pm2Stdout, pm2Stderr) {

          if (pm2Stdout) {
            logRuntime += `\n[STDOUT PM2]\n${pm2Stdout}`;
          }

          if (pm2Stderr) {
            logRuntime += `\n[STDERR PM2]\n${pm2Stderr}`;
          }

          if (pm2Error) {

            logRuntime +=
              '\n❌ PM2 no pudo iniciar.\n' +
              `🧠 Error:\n${pm2Error.message}\n`;

            fs.writeFileSync(archivoLog, logRuntime, 'utf8');

            await Proyecto.updateOne({ id }).set({
              estadoDeploy: 'fallido',
              logDeploy: logRuntime
            });

            return;
          }

          logRuntime +=
            '\n✅ PM2 iniciado.\n' +
            '⏳ Esperando 25 segundos...\n';

          fs.writeFileSync(archivoLog, logRuntime, 'utf8');

          await Proyecto.updateOne({ id }).set({
            estadoDeploy: 'verificando',
            logDeploy: logRuntime
          });

          setTimeout(function() {

            exec(
              `curl -I http://127.0.0.1:${puerto}`,
              {
                timeout: 20000,
                maxBuffer: 1024 * 1024 * 5
              },

              async function(curlError, curlStdout, curlStderr) {

                if (curlStdout) {
                  logRuntime += `\n[STDOUT curl]\n${curlStdout}`;
                }

                if (curlStderr) {
                  logRuntime += `\n[STDERR curl]\n${curlStderr}`;
                }

                if (curlError) {

                  logRuntime +=
                    '\n❌ Runtime no respondió.\n' +
                    `🔌 Puerto:\n${puerto}\n` +
                    '💡 Revisa que la app hija use process.env.PORT.\n' +
                    '💡 Si es Sails, revisa config/env/production.js.\n';

                  fs.writeFileSync(archivoLog, logRuntime, 'utf8');

                  await Proyecto.updateOne({ id }).set({
                    estadoDeploy: 'fallido',
                    logDeploy: logRuntime
                  });

                  return;
                }

                logRuntime +=
                  '\n✅ Runtime respondiendo correctamente.\n' +
                  `🌐 Demo lista:\n${urlCompleta}\n`;

                fs.writeFileSync(archivoLog, logRuntime, 'utf8');

                await Proyecto.updateOne({ id }).set({
                  estadoDeploy: 'activo',
                  puerto,
                  urlDemo,
                  logDeploy: logRuntime
                });

              }
            );

          }, 25000);

        }
      );

    }
  );

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

      const carpetaRuntime = proyecto.carpetaRuntime || proyecto.slug;

       const pm2Bin = path.resolve(
       sails.config.appPath,
        'node_modules',
       '.bin',
         process.platform === 'win32' ? 'pm2.cmd' : 'pm2'
      );

exec(`"${pm2Bin}" delete "${carpetaRuntime}" || true`);

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

      const carpetaRuntime = proyecto.carpetaRuntime || proyecto.slug;

      const pm2Bin = path.resolve(
       sails.config.appPath,
       'node_modules',
        '.bin',
        process.platform === 'win32' ? 'pm2.cmd' : 'pm2'
      );

exec(`"${pm2Bin}" delete "${carpetaRuntime}" || true`);

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