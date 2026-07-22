/**
 * RuntimeManager.js
 * Inicia y detiene aplicaciones administradas por DemoFlow.
 */

'use strict';

const { exec } = require('child_process');

/**
 * Ejecuta un comando y devuelve su salida.
 */
function ejecutar(comando, opciones = {}) {
  return new Promise((resolve, reject) => {
    exec(
      comando,
      {
        windowsHide: true,
        ...opciones
      },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(stderr || error.message));
        }

        return resolve(stdout);
      }
    );
  });
}

/**
 * Determina si la URL pertenece a una base PostgreSQL local.
 */
function esBaseDeDatosLocal(databaseUrl) {
  const url = String(databaseUrl || '').toLowerCase();

  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('::1')
  );
}

module.exports = {

  /**
   * Levanta una aplicación mediante PM2.
   */
  levantar: async function ({
    appPath,
    appName,
    puerto,
    databaseUrl
  }) {

    if (!appPath) {
      throw new Error('No se recibió la ruta del proyecto.');
    }

    if (!appName) {
      throw new Error('No se recibió el nombre del proceso PM2.');
    }

    if (!puerto) {
      throw new Error('No se recibió el puerto del runtime.');
    }

    const nodeEnv = esBaseDeDatosLocal(databaseUrl)
      ? 'development'
      : 'production';

    const runtimeEnv = {
      ...process.env,

      PORT: String(puerto),

      NODE_ENV: nodeEnv
    };

    if (databaseUrl) {
      runtimeEnv.DATABASE_URL = databaseUrl;
    }

    sails.log.info('🤖 IA DemoFlow: Preparando runtime PM2...', {
      appName,
      appPath,
      puerto,
      nodeEnv,
      databaseLocal: esBaseDeDatosLocal(databaseUrl),
      tieneDatabaseUrl: Boolean(databaseUrl)
    });

    /*
     * Eliminamos el proceso anterior.
     * Si no existe, continuamos normalmente.
     */
    try {
      await ejecutar(
        `pm2 delete "${appName}"`,
        {
          cwd: appPath,
          env: runtimeEnv
        }
      );
    } catch (error) {
      sails.log.info(
        `🤖 IA DemoFlow: El proceso ${appName} no existía en PM2.`
      );
    }

    const resultado = await ejecutar(
      `pm2 start app.js --name "${appName}" --interpreter node --update-env`,
      {
        cwd: appPath,
        env: runtimeEnv
      }
    );

    sails.log.info('✅ IA DemoFlow: Runtime iniciado correctamente.', {
      appName,
      puerto,
      nodeEnv
    });

    return resultado;
  },

  /**
   * Detiene y elimina una aplicación de PM2.
   */
  detener: async function (appName) {

    if (!appName) {
      throw new Error('No se recibió el nombre del proceso PM2.');
    }

    try {
      const resultado = await ejecutar(
        `pm2 delete "${appName}"`
      );

      sails.log.info('✅ IA DemoFlow: Runtime detenido.', {
        appName
      });

      return resultado;

    } catch (error) {
      sails.log.warn(
        `⚠️ IA DemoFlow: El runtime ${appName} no estaba activo.`
      );

      return '';
    }
  }

};