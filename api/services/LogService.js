/**
 * LogService.js
 * IA de análisis de logs para DemoFlow
 */

const fs = require('fs');
const path = require('path');

module.exports = {

  analizarLog: async function (textoLog = '') {

    const resultado = {
      estado: 'desconocido',
      errores: [],
      recomendaciones: [],
      detectado: []
    };

    const log = textoLog.toLowerCase();

    // =====================================
    // SAILS
    // =====================================

    if (log.includes('sails')) {

      resultado.detectado.push('Sails.js');

      resultado.recomendaciones.push(
        'Framework Sails detectado.'
      );
    }

    // =====================================
    // NODE
    // =====================================

    if (
      log.includes('node app.js') ||
      log.includes('node server.js')
    ) {

      resultado.detectado.push('Node.js');
    }

    // =====================================
    // PM2
    // =====================================

    if (log.includes('pm2')) {

      resultado.detectado.push('PM2');

      resultado.recomendaciones.push(
        'PM2 mantiene la aplicación online.'
      );
    }

    // =====================================
    // POSTGRES
    // =====================================

    if (
      log.includes('postgres') ||
      log.includes('database')
    ) {

      resultado.detectado.push('PostgreSQL');
    }

    // =====================================
    // APP ONLINE
    // =====================================

    if (
      log.includes('http/1.1 200 ok') ||
      log.includes('online')
    ) {

      resultado.estado = 'activo';

      resultado.recomendaciones.push(
        'La aplicación está respondiendo correctamente.'
      );
    }

    // =====================================
    // ERRORES
    // =====================================

    if (log.includes('error')) {

      resultado.estado = 'error';

      resultado.errores.push(
        'Se detectaron errores en el deploy.'
      );
    }

    if (log.includes('npm err')) {

      resultado.errores.push(
        'Falló npm install.'
      );

      resultado.recomendaciones.push(
        'Verificar package.json.'
      );
    }

    if (log.includes('eaddrinuse')) {

      resultado.errores.push(
        'Puerto ocupado.'
      );

      resultado.recomendaciones.push(
        'Asignar puerto automático.'
      );
    }

    if (log.includes('cannot find module')) {

      resultado.errores.push(
        'Dependencia faltante.'
      );

      resultado.recomendaciones.push(
        'Ejecutar npm install.'
      );
    }

    if (log.includes('timeout')) {

      resultado.errores.push(
        'Tiempo de espera excedido.'
      );
    }

    // =====================================
    // SIN ERRORES
    // =====================================

    if (
      resultado.errores.length === 0 &&
      resultado.estado !== 'activo'
    ) {

      resultado.estado = 'estable';
    }

    return resultado;
  },

  guardarLog: async function (ruta, contenido) {

    const carpeta = path.dirname(ruta);

    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true });
    }

    fs.writeFileSync(ruta, contenido, 'utf8');

    return true;
  },

  leerLog: async function (ruta) {

    if (!fs.existsSync(ruta)) {
      return '';
    }

    return fs.readFileSync(ruta, 'utf8');
  }

};