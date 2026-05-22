const fs = require('fs');
const path = require('path');

module.exports = {

  analizarProyecto: async function (rutaProyecto) {

    try {

      const resultado = {
        tecnologia: 'desconocida',
        tienePackageJson: false,
        tieneNodeModules: false,
        tieneSails: false,
        tieneReact: false,
        tieneHTML: false,
        listoParaDeploy: false,
        recomendaciones: [],
        errores: []
      };

      // =========================
      // PACKAGE.JSON
      // =========================

      const packagePath = path.join(rutaProyecto, 'package.json');

      if (fs.existsSync(packagePath)) {

        resultado.tienePackageJson = true;

        const packageJson = JSON.parse(
          fs.readFileSync(packagePath, 'utf8')
        );

        // Detectar Sails
        if (
          packageJson.dependencies &&
          packageJson.dependencies.sails
        ) {

          resultado.tieneSails = true;
          resultado.tecnologia = 'Sails.js';

        }

        // Detectar React
        if (
          packageJson.dependencies &&
          packageJson.dependencies.react
        ) {

          resultado.tieneReact = true;
          resultado.tecnologia = 'React';

        }

      }

      // =========================
      // NODE_MODULES
      // =========================

      const nodeModulesPath = path.join(
        rutaProyecto,
        'node_modules'
      );

      if (fs.existsSync(nodeModulesPath)) {

        resultado.tieneNodeModules = true;

      } else {

        resultado.errores.push(
          'Falta instalar node_modules'
        );

      }

      // =========================
      // HTML
      // =========================

      const htmlPath = path.join(
        rutaProyecto,
        'index.html'
      );

      if (fs.existsSync(htmlPath)) {

        resultado.tieneHTML = true;

        if (resultado.tecnologia === 'desconocida') {
          resultado.tecnologia = 'HTML';
        }

      }

      // =========================
      // VALIDACIONES
      // =========================

      if (
        resultado.tieneHTML ||
        resultado.tieneSails ||
        resultado.tieneReact
      ) {

        resultado.listoParaDeploy = true;

      }

      // =========================
      // IA RECOMENDACIONES
      // =========================

      if (resultado.tieneHTML) {

        resultado.recomendaciones.push(
          'Proyecto frontend listo para deploy rápido.'
        );

      }

      if (resultado.tieneSails) {

        resultado.recomendaciones.push(
          'Aplicación Sails detectada.'
        );

      }

      if (resultado.tieneReact) {

        resultado.recomendaciones.push(
          'Aplicación React detectada.'
        );

      }

      if (!resultado.tienePackageJson) {

        resultado.recomendaciones.push(
          'Agrega package.json para mejor compatibilidad.'
        );

      }

      return resultado;

    } catch (error) {

      sails.log.error(
        '🤖 IAAnalyzerService ERROR:',
        error
      );

      return {
        error: true,
        mensaje: error.message
      };

    }

  }

};