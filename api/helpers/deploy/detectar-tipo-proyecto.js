const fs = require('fs');
const path = require('path');

module.exports = {

  friendlyName: 'Detectar tipo proyecto',

  description: 'Detecta si el proyecto es html, node, sails o desconocido.',

  inputs: {
    carpeta: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Tipo detectado correctamente.'
    }
  },

  fn: async function (inputs, exits) {
    const rutaIndex = path.join(inputs.carpeta, 'index.html');
    const rutaPackage = path.join(inputs.carpeta, 'package.json');
    const rutaApp = path.join(inputs.carpeta, 'app.js');

    if (fs.existsSync(rutaIndex)) {
      return exits.success({
        ok: true,
        tipo: 'html'
      });
    }

    if (fs.existsSync(rutaPackage)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rutaPackage, 'utf8'));
        const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});

        if (deps.sails) {
          return exits.success({
            ok: true,
            tipo: 'sails'
          });
        }

        return exits.success({
          ok: true,
          tipo: 'node'
        });
      } catch (error) {
        return exits.success({
          ok: true,
          tipo: 'node'
        });
      }
    }

    if (fs.existsSync(rutaApp)) {
      return exits.success({
        ok: true,
        tipo: 'node'
      });
    }

    return exits.success({
      ok: false,
      tipo: 'desconocido'
    });
  }

};