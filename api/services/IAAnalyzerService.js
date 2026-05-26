const fs = require('fs');
const path = require('path');

module.exports = {

  analizarProyecto: async function(rutaProyecto) {

    const resultado = {
      tecnologia: 'Demo externa',
      tienePackageJson: false,
      tieneNodeModules: false,
      tieneSails: false,
      tieneReact: false,
      tieneHTML: false,
      listoParaDeploy: true,
      recomendaciones: [],
      errores: []
    };

    try {

      if (!rutaProyecto || !fs.existsSync(rutaProyecto)) {
        resultado.recomendaciones.push(
          'DemoFlow IA no encontró carpeta local. Posiblemente es una URL externa.'
        );

        return resultado;
      }

      const packagePath = path.join(rutaProyecto, 'package.json');

      if (fs.existsSync(packagePath)) {
        resultado.tienePackageJson = true;

        let packageJson = {};

        try {
          packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } catch (e) {
          resultado.errores.push('package.json no tiene formato JSON válido.');
        }

        const deps = Object.assign(
          {},
          packageJson.dependencies || {},
          packageJson.devDependencies || {}
        );

        if (deps.sails) {
          resultado.tieneSails = true;
          resultado.tecnologia = 'Sails.js + Node.js';
        }

        if (deps.react) {
          resultado.tieneReact = true;
          resultado.tecnologia = 'React';
        }

        if (packageJson.scripts && packageJson.scripts.start) {
          resultado.recomendaciones.push(
            'Script start detectado correctamente.'
          );
        } else {
          resultado.recomendaciones.push(
            'Agrega un script start en package.json para mejorar el deploy.'
          );
        }
      }

      const htmlPath = path.join(rutaProyecto, 'index.html');

      if (fs.existsSync(htmlPath)) {
        resultado.tieneHTML = true;

        if (resultado.tecnologia === 'Demo externa') {
          resultado.tecnologia = 'HTML + CSS + JavaScript';
        }
      }

      const nodeModulesPath = path.join(rutaProyecto, 'node_modules');

      if (fs.existsSync(nodeModulesPath)) {
        resultado.tieneNodeModules = true;
      } else if (resultado.tienePackageJson) {
        resultado.recomendaciones.push(
          'node_modules no está presente, pero Render puede instalar dependencias con npm install.'
        );
      }

      if (
        resultado.tieneHTML ||
        resultado.tieneSails ||
        resultado.tieneReact ||
        resultado.tienePackageJson
      ) {
        resultado.listoParaDeploy = true;
      }

      if (resultado.tieneHTML) {
        resultado.recomendaciones.push(
          'Proyecto frontend listo para deploy rápido.'
        );
      }

      if (resultado.tieneSails) {
        resultado.recomendaciones.push(
          'Aplicación Sails detectada y compatible con DemoFlow.'
        );
      }

      if (resultado.tieneReact) {
        resultado.recomendaciones.push(
          'Aplicación React detectada.'
        );
      }

      if (!resultado.tienePackageJson && !resultado.tieneHTML) {
        resultado.recomendaciones.push(
          'Agrega package.json o index.html para que DemoFlow IA detecte mejor el proyecto.'
        );
      }

      if (resultado.recomendaciones.length === 0) {
        resultado.recomendaciones.push(
          'Proyecto registrado correctamente en DemoFlow.'
        );
      }

      return resultado;

    } catch (error) {

      if (typeof sails !== 'undefined' && sails.log) {
        sails.log.error('🤖 IAAnalyzerService ERROR:', error);
      } else {
        console.error('🤖 IAAnalyzerService ERROR:', error);
      }

      resultado.listoParaDeploy = false;
      resultado.errores.push(
        error.message || 'Error desconocido analizando proyecto.'
      );

      return resultado;
    }
  }
};