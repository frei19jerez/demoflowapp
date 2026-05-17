const { spawn } = require('child_process');

module.exports = {

  friendlyName: 'Levantar app',

  description: 'Levanta una app Node o Sails con un puerto asignado.',

  inputs: {
    carpeta: {
      type: 'string',
      required: true
    },
    tipo: {
      type: 'string',
      required: true
    },
    puerto: {
      type: 'number',
      required: true
    },
    comandoInicio: {
      type: 'string',
      allowNull: true
    }
  },

  exits: {
    success: {
      description: 'App levantada correctamente.'
    },
    errorRun: {
      description: 'No se pudo iniciar la app.'
    }
  },

  fn: async function (inputs, exits) {
    try {
      let comando = 'node';
      let args = ['app.js'];

      if (inputs.comandoInicio && inputs.comandoInicio.trim() !== '') {
        const partes = inputs.comandoInicio.trim().split(' ');
        comando = partes[0];
        args = partes.slice(1);
      } else if (inputs.tipo === 'node') {
        comando = 'node';
        args = ['app.js'];
      } else if (inputs.tipo === 'sails') {
        comando = 'node';
        args = ['app.js'];
      }

      const proceso = spawn(comando, args, {
        cwd: inputs.carpeta,
        env: {
          ...process.env,
          PORT: String(inputs.puerto)
        },
        shell: true
      });

      proceso.on('error', function (error) {
        return exits.errorRun({
          ok: false,
          mensaje: error.message
        });
      });

      return exits.success({
        ok: true,
        pid: proceso.pid,
        puerto: inputs.puerto
      });
    } catch (error) {
      return exits.errorRun({
        ok: false,
        mensaje: error.message
      });
    }
  }

};