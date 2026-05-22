/**
 * ZipDetectorService.js
 * IA DemoFlow para detectar proyectos ZIP
 */

const fs = require('fs');
const path = require('path');

module.exports = {

  detectarProyecto: async function (carpeta) {

    const resultado = {

      tipo: 'desconocido',
      tecnologia: [],
      entrada: '',
      comando: '',
      necesitaNpmInstall: false,
      necesitaPM2: false,
      recomendaciones: []

    };

    // =====================================
    // RUTAS
    // =====================================

    const packageJson =
      path.join(carpeta, 'package.json');

    const appJs =
      path.join(carpeta, 'app.js');

    const serverJs =
      path.join(carpeta, 'server.js');

    const indexHtml =
      path.join(carpeta, 'index.html');

    const sailsRoutes =
      path.join(carpeta, 'config', 'routes.js');

    // =====================================
    // PACKAGE.JSON
    // =====================================

    if (fs.existsSync(packageJson)) {

      resultado.necesitaNpmInstall = true;

      const contenido =
        fs.readFileSync(packageJson, 'utf8');

      // =========================
      // SAILS
      // =========================

      if (
        contenido.includes('"sails"') ||
        fs.existsSync(sailsRoutes)
      ) {

        resultado.tipo = 'sails';

        resultado.tecnologia.push('Sails.js');
        resultado.tecnologia.push('Node.js');

        resultado.entrada = 'app.js';
        resultado.comando = 'node app.js';

        resultado.necesitaPM2 = true;

        resultado.recomendaciones.push(
          'Proyecto Sails detectado correctamente.'
        );
      }

      // =========================
      // EXPRESS / NODE
      // =========================

      else {

        resultado.tipo = 'node';

        resultado.tecnologia.push('Node.js');

        resultado.necesitaPM2 = true;

        if (fs.existsSync(serverJs)) {

          resultado.entrada = 'server.js';
          resultado.comando = 'node server.js';

        } else {

          resultado.entrada = 'app.js';
          resultado.comando = 'node app.js';
        }

        resultado.recomendaciones.push(
          'Aplicación Node.js lista para deploy.'
        );
      }

      // =========================
      // POSTGRES
      // =========================

      if (
        contenido.includes('postgres') ||
        contenido.includes('sails-postgresql')
      ) {

        resultado.tecnologia.push('PostgreSQL');
      }

      // =========================
      // SOCKET.IO
      // =========================

      if (
        contenido.includes('socket.io')
      ) {

        resultado.tecnologia.push('Socket.IO');
      }

    }

    // =====================================
    // HTML ESTÁTICO
    // =====================================

    else if (fs.existsSync(indexHtml)) {

      resultado.tipo = 'html';

      resultado.tecnologia.push('HTML');
      resultado.tecnologia.push('CSS');
      resultado.tecnologia.push('JavaScript');

      resultado.entrada = 'index.html';
      resultado.comando = 'estatico';

      resultado.recomendaciones.push(
        'Proyecto frontend liviano detectado.'
      );
    }

    // =====================================
    // DESCONOCIDO
    // =====================================

    else {

      resultado.recomendaciones.push(
        'No se pudo detectar el tipo de proyecto.'
      );
    }

    return resultado;
  }

};