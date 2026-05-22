/**
 * IADeployService.js
 * Inteligencia artificial básica para DemoFlow
 */

const fs = require('fs');
const path = require('path');

module.exports = {

  analizarProyecto: async function (carpetaProyecto) {

    let resultado = {
      tipo: 'desconocido',
      tecnologia: [],
      recomendaciones: [],
      comandoInicio: '',
      archivoEntrada: '',
      tienePackageJson: false,
      tieneHTML: false,
      tieneSails: false,
      tieneNode: false
    };

    // =========================
    // ARCHIVOS
    // =========================

    const packageJson = path.join(carpetaProyecto, 'package.json');
    const appJs = path.join(carpetaProyecto, 'app.js');
    const serverJs = path.join(carpetaProyecto, 'server.js');
    const indexHtml = path.join(carpetaProyecto, 'index.html');
    const sailsConfig = path.join(carpetaProyecto, 'config', 'routes.js');

    // =========================
    // PACKAGE.JSON
    // =========================

    if (fs.existsSync(packageJson)) {

      resultado.tienePackageJson = true;

      const contenido = fs.readFileSync(packageJson, 'utf8');

      // NODE
      if (
        contenido.includes('"express"') ||
        contenido.includes('"node"')
      ) {

        resultado.tieneNode = true;
        resultado.tipo = 'node';
        resultado.tecnologia.push('Node.js');
      }

      // SAILS
      if (
        contenido.includes('"sails"') ||
        fs.existsSync(sailsConfig)
      ) {

        resultado.tieneSails = true;
        resultado.tipo = 'sails';
        resultado.tecnologia.push('Sails.js');
      }

      // POSTGRES
      if (
        contenido.includes('postgres') ||
        contenido.includes('sails-postgresql')
      ) {

        resultado.tecnologia.push('PostgreSQL');
      }

      // SOCKET.IO
      if (contenido.includes('socket.io')) {
        resultado.tecnologia.push('Socket.IO');
      }

    }

    // =========================
    // HTML
    // =========================

    if (fs.existsSync(indexHtml)) {

      resultado.tieneHTML = true;

      if (resultado.tipo === 'desconocido') {
        resultado.tipo = 'html';
      }

      resultado.tecnologia.push('HTML');
      resultado.tecnologia.push('CSS');
      resultado.tecnologia.push('JavaScript');
    }

    // =========================
    // DETECTAR ENTRADA
    // =========================

    if (fs.existsSync(appJs)) {
      resultado.archivoEntrada = 'app.js';
      resultado.comandoInicio = 'node app.js';
    }

    if (fs.existsSync(serverJs)) {
      resultado.archivoEntrada = 'server.js';
      resultado.comandoInicio = 'node server.js';
    }

    if (
      resultado.tipo === 'html' &&
      fs.existsSync(indexHtml)
    ) {

      resultado.archivoEntrada = 'index.html';
      resultado.comandoInicio = 'estatico';
    }

    // =========================
    // IA RECOMENDACIONES
    // =========================

    if (resultado.tipo === 'sails') {

      resultado.recomendaciones.push(
        'Proyecto Sails detectado correctamente.'
      );

      resultado.recomendaciones.push(
        'Usar PM2 para mantener la app online.'
      );

      resultado.recomendaciones.push(
        'Asignar puerto automático desde DemoFlow.'
      );
    }

    if (resultado.tipo === 'node') {

      resultado.recomendaciones.push(
        'Aplicación Node.js lista para deploy.'
      );
    }

    if (resultado.tipo === 'html') {

      resultado.recomendaciones.push(
        'Proyecto frontend liviano detectado.'
      );

      resultado.recomendaciones.push(
        'No necesita npm install.'
      );
    }

    return resultado;
  }

};