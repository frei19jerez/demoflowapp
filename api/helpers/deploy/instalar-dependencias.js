const { exec } = require('child_process');

module.exports = {

  friendlyName: 'Instalar dependencias',

  description: 'Ejecuta npm install dentro de una carpeta.',

  inputs: {
    carpeta: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Dependencias instaladas.'
    },
    errorInstall: {
      description: 'Falló npm install.'
    }
  },

  fn: async function (inputs, exits) {
    exec(
      'npm install',
      { cwd: inputs.carpeta },
      function (error, stdout, stderr) {
        if (error) {
          return exits.errorInstall({
            ok: false,
            mensaje: stderr || error.message
          });
        }

        return exits.success({
          ok: true,
          salida: stdout
        });
      }
    );
  }

};