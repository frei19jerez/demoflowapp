const { exec } = require('child_process');

module.exports = {

  friendlyName: 'Detener app',

  description: 'Detiene un proceso por PID.',

  inputs: {
    pid: {
      type: 'number',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Proceso detenido.'
    },
    errorStop: {
      description: 'No se pudo detener el proceso.'
    }
  },

  fn: async function (inputs, exits) {
    const comando = process.platform === 'win32'
      ? `taskkill /PID ${inputs.pid} /F`
      : `kill -9 ${inputs.pid}`;

    exec(comando, function (error, stdout, stderr) {
      if (error) {
        return exits.errorStop({
          ok: false,
          mensaje: stderr || error.message
        });
      }

      return exits.success({
        ok: true,
        salida: stdout
      });
    });
  }

};