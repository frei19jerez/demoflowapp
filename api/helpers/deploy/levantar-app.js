const path = require('path');
const { exec } = require('child_process');

module.exports = {
  friendlyName: 'Levantar app',

  description: 'Levanta una app Node o Sails con PM2 y un puerto asignado.',

  inputs: {
    carpeta: { type: 'string', required: true },
    tipo: { type: 'string', required: true },
    puerto: { type: 'number', required: true },
    comandoInicio: { type: 'string', allowNull: true },
    nombre: { type: 'string', required: true }
  },

  exits: {
    success: { description: 'App levantada correctamente.' },
    errorRun: { description: 'No se pudo iniciar la app.' }
  },

  fn: async function (inputs, exits) {
    try {
      const pm2Bin = path.resolve(
        sails.config.appPath,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'pm2.cmd' : 'pm2'
      );

      const nombrePm2 = inputs.nombre;

      const comandoInicio =
        inputs.comandoInicio && inputs.comandoInicio.trim() !== ''
          ? inputs.comandoInicio.trim()
          : 'node app.js';

      let comandoPm2;

      if (comandoInicio.startsWith('node ')) {
        const archivo = comandoInicio.replace('node ', '').trim() || 'app.js';

        comandoPm2 =
          `"${pm2Bin}" delete "${nombrePm2}" || true && ` +
          `"${pm2Bin}" start "${archivo}" --name "${nombrePm2}" --update-env`;
      } else {
        comandoPm2 =
          `"${pm2Bin}" delete "${nombrePm2}" || true && ` +
          `"${pm2Bin}" start npm --name "${nombrePm2}" -- start --update-env`;
      }

      exec(
        comandoPm2,
        {
          cwd: inputs.carpeta,
          env: {
            ...process.env,
            PORT: String(inputs.puerto),
            NODE_ENV: 'production'
          }
        },
        function (error, stdout, stderr) {
          if (error) {
            return exits.errorRun({
              ok: false,
              mensaje: error.message,
              stdout,
              stderr
            });
          }

          return exits.success({
            ok: true,
            nombre: nombrePm2,
            puerto: inputs.puerto,
            stdout,
            stderr
          });
        }
      );
    } catch (error) {
      return exits.errorRun({
        ok: false,
        mensaje: error.message
      });
    }
  }
};