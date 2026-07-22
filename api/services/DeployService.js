/**
 * DeployService.js
 * Servicio central para deploys de DemoFlow IA
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec } = require('child_process');

function ejecutar(comando, cwd, envExtra = {}) {
  return new Promise((resolve) => {
    exec(
      comando,
      {
        cwd,
        timeout: 300000,
        env: {
          ...process.env,
          ...envExtra
        }
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          error,
          stdout,
          stderr
        });
      }
    );
  });
}

module.exports = {

  iaNombre: 'DemoFlow IA',

  iaLog: function (mensaje, data = '') {
    sails.log.info(`🤖 IA DemoFlow: ${mensaje}`, data);
  },

  iaError: function (mensaje, data = '') {
    sails.log.error(`❌ IA DemoFlow: ${mensaje}`, data);
  },

  puertoAleatorio: function () {
    return Math.floor(4100 + Math.random() * 900);
  },

  limpiarSlug: function (valor) {
    return String(valor || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  rutaBaseRuntime: function () {
    const base = process.env.DEMOFLOW_STORAGE || process.cwd();
    return path.join(base, 'deploy_runtime', 'apps');
  },

  rutaRuntime: function (slug) {
    return path.join(this.rutaBaseRuntime(), slug);
  },

  existe: async function (ruta) {
    try {
      await fsp.access(ruta);
      return true;
    } catch (err) {
      return false;
    }
  },

  obtenerPuertoProyecto: function (proyecto = {}) {
    return proyecto.puerto || proyecto.puertoInterno || proyecto.runtimePort || proyecto.port;
  },

  parseRuntimeEnv: function (runtimeEnv) {
    const env = {};

    if (!runtimeEnv) {
      return env;
    }

    if (typeof runtimeEnv === 'object') {
      return runtimeEnv;
    }

    try {
      const parsed = JSON.parse(runtimeEnv);

      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      // Si no es JSON, se procesa como formato .env
    }

    String(runtimeEnv)
      .split('\n')
      .map((linea) => linea.trim())
      .filter(Boolean)
      .forEach((linea) => {
        if (linea.startsWith('#')) return;

        const index = linea.indexOf('=');
        if (index === -1) return;

        const key = linea.slice(0, index).trim();
        const value = linea.slice(index + 1).trim();

        if (key) {
          env[key] = value;
        }
      });

    return env;
  },

  construirEnvRuntime: function (proyecto = {}, puerto) {

  const databaseUrl =
    proyecto.databaseUrl ||
    proyecto.database_url ||
    process.env.DATABASE_URL;

  const sessionSecret =
    proyecto.sessionSecret ||
    proyecto.session_secret ||
    process.env.SESSION_SECRET ||
    ('demoflow-runtime-secret-' + (proyecto.slug || proyecto.id || 'app'));

  const runtimeEnv =
    proyecto.runtimeEnv ||
    proyecto.runtime_env ||
    '';

  const extras = this.parseRuntimeEnv(runtimeEnv);

  const database = String(databaseUrl || '').toLowerCase();

  const esBaseLocal =
    database.includes('localhost') ||
    database.includes('127.0.0.1') ||
    database.includes('::1');

  const nodeEnv = esBaseLocal
    ? 'development'
    : 'production';

  this.iaLog('Construyendo variables de entorno del runtime...', {
    puerto,
    nodeEnv,
    databaseLocal: esBaseLocal,
    tieneDatabaseUrl: !!databaseUrl,
    tieneSessionSecret: !!sessionSecret,
    tieneRuntimeEnv: !!runtimeEnv
  });

  return {

    PORT: String(puerto),

    NODE_ENV: nodeEnv,

    DATABASE_URL: databaseUrl,

    SESSION_SECRET: sessionSecret,

    DEMOFLOW_PROJECT_ID: proyecto.id
      ? String(proyecto.id)
      : '',

    DEMOFLOW_PROJECT_SLUG:
      proyecto.slug || '',

    ...extras

  };

},

  detectarTipo: async function (carpeta) {
    this.iaLog('Analizando estructura del proyecto...', carpeta);

    const packageJson = path.join(carpeta, 'package.json');
    const appJs = path.join(carpeta, 'app.js');
    const serverJs = path.join(carpeta, 'server.js');
    const indexJs = path.join(carpeta, 'index.js');
    const indexHtml = path.join(carpeta, 'index.html');
    const routesJs = path.join(carpeta, 'config', 'routes.js');

    if (await this.existe(packageJson)) {
      const contenido = await fsp.readFile(packageJson, 'utf8');

      if (contenido.includes('sails') || await this.existe(routesJs)) {
        return {
          tipo: 'sails',
          comando: 'node app.js',
          entrada: 'app.js',
          ia: 'Proyecto Sails.js detectado por IA'
        };
      }

      if (await this.existe(serverJs)) {
        return {
          tipo: 'node',
          comando: 'node server.js',
          entrada: 'server.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      if (await this.existe(appJs)) {
        return {
          tipo: 'node',
          comando: 'node app.js',
          entrada: 'app.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      if (await this.existe(indexJs)) {
        return {
          tipo: 'node',
          comando: 'node index.js',
          entrada: 'index.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      return {
        tipo: 'node',
        comando: 'npm start',
        entrada: 'package.json',
        ia: 'Proyecto Node.js con script npm start'
      };
    }

    if (await this.existe(indexHtml)) {
      return {
        tipo: 'html',
        comando: '',
        entrada: 'index.html',
        ia: 'Proyecto HTML estático detectado por IA'
      };
    }

    return {
      tipo: 'externo',
      comando: '',
      entrada: '',
      ia: 'Proyecto externo detectado por IA'
    };
  },

  instalarDependencias: async function (carpeta) {
    this.iaLog('Instalando dependencias...', carpeta);
    return await ejecutar('npm install', carpeta);
  },

  iniciarConPM2: async function ({ carpeta, nombrePM2, comando, puerto, proyecto }) {
    let finalCommand = '';

    if (comando === 'node app.js') {
      finalCommand = `pm2 start app.js --name "${nombrePM2}" --interpreter node --update-env`;
    } else if (comando === 'node server.js') {
      finalCommand = `pm2 start server.js --name "${nombrePM2}" --interpreter node --update-env`;
    } else if (comando === 'node index.js') {
      finalCommand = `pm2 start index.js --name "${nombrePM2}" --interpreter node --update-env`;
    } else {
      finalCommand = `pm2 start npm --name "${nombrePM2}" --update-env -- start`;
    }

    const envRuntime = this.construirEnvRuntime(proyecto, puerto);

    this.iaLog('Iniciando runtime con PM2...', {
      comando: finalCommand,
      puerto,
      nombrePM2,
      tieneDatabaseUrl: !!envRuntime.DATABASE_URL,
      tieneSessionSecret: !!envRuntime.SESSION_SECRET,
      tieneRuntimeEnv: !!(proyecto.runtimeEnv || proyecto.runtime_env)
    });

    return await ejecutar(finalCommand, carpeta, envRuntime);
  },

  detenerPM2: async function (nombrePM2) {
    this.iaLog('Deteniendo runtime PM2...', nombrePM2);
    return await ejecutar(`pm2 delete "${nombrePM2}" || true`, process.cwd());
  },

  reiniciarPM2: async function (nombrePM2, proyecto, puerto, carpeta) {
    const envRuntime = this.construirEnvRuntime(proyecto, puerto);

    this.iaLog('Reiniciando runtime PM2...', {
      nombrePM2,
      puerto,
      tieneDatabaseUrl: !!envRuntime.DATABASE_URL,
      tieneSessionSecret: !!envRuntime.SESSION_SECRET,
      tieneRuntimeEnv: !!(proyecto.runtimeEnv || proyecto.runtime_env)
    });

    return await ejecutar(
      `pm2 restart "${nombrePM2}" --update-env`,
      carpeta || process.cwd(),
      envRuntime
    );
  },

  verificarPuerto: async function (puerto) {
    this.iaLog('Verificando salud del runtime...', puerto);
    return await ejecutar(`curl -I http://127.0.0.1:${puerto}`, process.cwd());
  },

  analizarProyectoIA: async function (carpeta) {
    const tipo = await this.detectarTipo(carpeta);

    return {
      ok: true,
      motor: 'DemoFlow IA',
      mensaje: tipo.ia,
      tipo: tipo.tipo,
      entrada: tipo.entrada,
      comando: tipo.comando
    };
  },

  reiniciarRuntime: async function (slug, puerto, proyecto = {}) {
    const nombrePM2 = 'demoflow-' + slug;

    this.iaLog('Reiniciando runtime por slug...', {
      slug,
      puerto,
      nombrePM2
    });

    const carpeta = this.rutaRuntime(slug);

    if (!(await this.existe(carpeta))) {
      return {
        ok: false,
        error: 'No existe la carpeta runtime. Vuelve a publicar este proyecto.',
        carpeta
      };
    }

    const detectado = await this.detectarTipo(carpeta);

    if (!detectado || detectado.tipo === 'html' || detectado.tipo === 'externo') {
      return {
        ok: true,
        mensaje: 'Proyecto HTML/externo no necesita PM2.',
        tipo: detectado ? detectado.tipo : 'desconocido'
      };
    }

    let resultado = await this.reiniciarPM2(nombrePM2, proyecto, puerto, carpeta);

    if (resultado && resultado.ok) {
      this.iaLog('Runtime reiniciado correctamente con PM2.', nombrePM2);
      return resultado;
    }

    this.iaLog('PM2 restart falló. Intentando iniciar runtime...', resultado ? resultado.stderr : '');

    const packageJson = path.join(carpeta, 'package.json');
    const nodeModules = path.join(carpeta, 'node_modules');

    if (await this.existe(packageJson) && !(await this.existe(nodeModules))) {
      const install = await this.instalarDependencias(carpeta);

      if (!install.ok) {
        return {
          ok: false,
          error: 'Falló npm install.',
          detalle: install.stderr || install.stdout
        };
      }
    }

    const comando = detectado.comando || 'node app.js';

    resultado = await this.iniciarConPM2({
      carpeta,
      nombrePM2,
      comando,
      puerto,
      proyecto
    });

    if (!resultado.ok) {
      return {
        ok: false,
        error: 'No se pudo iniciar runtime con PM2.',
        detalle: resultado.stderr || resultado.stdout
      };
    }

    return {
      ok: true,
      mensaje: 'Runtime iniciado correctamente.',
      slug,
      puerto,
      nombrePM2,
      carpeta,
      comando
    };
  },

  actualizarDesdeGit: async function (proyecto) {
    try {
      const slug = proyecto.slug;
      const puerto = this.obtenerPuertoProyecto(proyecto);
      const carpeta = this.rutaRuntime(slug);
      const nombrePM2 = 'demoflow-' + slug;

      this.iaLog('Actualizando proyecto desde Git...', {
        slug,
        puerto,
        carpeta
      });

      if (!slug || !puerto) {
        return {
          ok: false,
          error: 'El proyecto no tiene slug o puerto configurado.'
        };
      }

      if (!(await this.existe(carpeta))) {
        return {
          ok: false,
          error: 'No existe la carpeta runtime del proyecto.',
          detalle: carpeta
        };
      }

      const gitFolder = path.join(carpeta, '.git');

      if (!(await this.existe(gitFolder))) {
        return {
          ok: false,
          error: 'Este proyecto no tiene carpeta .git. No se puede actualizar desde Git.'
        };
      }

      await this.detenerPM2(nombrePM2);

      const rama = proyecto.rama || proyecto.branch || 'main';

      await ejecutar('git reset --hard HEAD', carpeta);
      await ejecutar('git clean -fd', carpeta);

      const fetch = await ejecutar('git fetch origin', carpeta);

      if (!fetch.ok) {
        return {
          ok: false,
          error: 'Error ejecutando git fetch.',
          detalle: fetch.stderr || fetch.stdout
        };
      }

      const reset = await ejecutar(`git reset --hard origin/${rama}`, carpeta);

      if (!reset.ok) {
        return {
          ok: false,
          error: `Error actualizando desde la rama ${rama}.`,
          detalle: reset.stderr || reset.stdout
        };
      }

      const packageJson = path.join(carpeta, 'package.json');

      if (await this.existe(packageJson)) {
        const install = await this.instalarDependencias(carpeta);

        if (!install.ok) {
          return {
            ok: false,
            error: 'Error ejecutando npm install.',
            detalle: install.stderr || install.stdout
          };
        }
      }

      const reinicio = await this.reiniciarRuntime(slug, puerto, proyecto);

      if (!reinicio.ok) {
        return {
          ok: false,
          error: 'El proyecto se actualizó, pero no pudo reiniciar el runtime.',
          detalle: reinicio.detalle || reinicio.error
        };
      }

      return {
        ok: true,
        mensaje: 'Proyecto actualizado desde Git correctamente.',
        rama,
        reinicio
      };

    } catch (error) {
      this.iaError('Error actualizarDesdeGit', error);

      return {
        ok: false,
        error: error.message
      };
    }
  },

  reemplazarArchivos: async function (proyecto, carpetaNueva) {
    let carpetaActual;
    let carpetaBackup;

    try {
      const slug = proyecto.slug;
      const puerto = this.obtenerPuertoProyecto(proyecto);
      const nombrePM2 = 'demoflow-' + slug;

      carpetaActual = this.rutaRuntime(slug);
      carpetaBackup = carpetaActual + '_backup_' + Date.now();

      this.iaLog('Reemplazando archivos del proyecto...', {
        slug,
        puerto,
        carpetaActual,
        carpetaNueva,
        carpetaBackup
      });

      if (!slug || !puerto) {
        return {
          ok: false,
          error: 'El proyecto no tiene slug o puerto configurado.'
        };
      }

      if (!carpetaNueva || !(await this.existe(carpetaNueva))) {
        return {
          ok: false,
          error: 'No existe la carpeta nueva para reemplazar archivos.'
        };
      }

      await this.detenerPM2(nombrePM2);

      if (await this.existe(carpetaActual)) {
        await fsp.cp(carpetaActual, carpetaBackup, {
          recursive: true,
          force: true
        });

        await fsp.rm(carpetaActual, {
          recursive: true,
          force: true
        });
      }

      await fsp.mkdir(path.dirname(carpetaActual), {
        recursive: true
      });

      await fsp.cp(carpetaNueva, carpetaActual, {
        recursive: true,
        force: true
      });

      const detectado = await this.detectarTipo(carpetaActual);

      const packageJson = path.join(carpetaActual, 'package.json');

      if (
        await this.existe(packageJson) &&
        (detectado.tipo === 'node' || detectado.tipo === 'sails')
      ) {
        const install = await this.instalarDependencias(carpetaActual);

        if (!install.ok) {
          throw new Error('Error instalando dependencias: ' + (install.stderr || install.stdout));
        }
      }

      const reinicio = await this.reiniciarRuntime(slug, puerto, proyecto);

      if (!reinicio.ok && detectado.tipo !== 'html') {
        throw new Error(reinicio.detalle || reinicio.error || 'No se pudo reiniciar PM2.');
      }

      if (carpetaBackup && await this.existe(carpetaBackup)) {
        await fsp.rm(carpetaBackup, {
          recursive: true,
          force: true
        });
      }

      return {
        ok: true,
        mensaje: 'Archivos reemplazados correctamente.',
        tipo: detectado.tipo,
        reinicio
      };

    } catch (error) {
      this.iaError('Error reemplazarArchivos', error);

      try {
        if (
          carpetaActual &&
          carpetaBackup &&
          await this.existe(carpetaBackup)
        ) {
          await fsp.rm(carpetaActual, {
            recursive: true,
            force: true
          });

          await fsp.cp(carpetaBackup, carpetaActual, {
            recursive: true,
            force: true
          });

          await fsp.rm(carpetaBackup, {
            recursive: true,
            force: true
          });
        }
      } catch (restoreError) {
        this.iaError('Error restaurando backup', restoreError);
      }

      return {
        ok: false,
        error: error.message
      };
    }
  }

};