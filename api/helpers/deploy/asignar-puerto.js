const net = require('net');

module.exports = {

  friendlyName: 'Asignar puerto',

  description: 'Busca un puerto libre dentro de un rango.',

  inputs: {
    inicio: {
      type: 'number',
      defaultsTo: 4000
    },
    fin: {
      type: 'number',
      defaultsTo: 5000
    }
  },

  exits: {
    success: {
      description: 'Puerto libre encontrado.'
    },
    noDisponible: {
      description: 'No se encontró un puerto libre.'
    }
  },

  fn: async function (inputs, exits) {

    async function puertoLibre(puerto) {
      return await new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', function () {
          resolve(false);
        });

        server.once('listening', function () {
          server.close(function () {
            resolve(true);
          });
        });

        server.listen(puerto, '127.0.0.1');
      });
    }

    for (let puerto = inputs.inicio; puerto <= inputs.fin; puerto++) {
      const libre = await puertoLibre(puerto);
      if (libre) {
        return exits.success({
          ok: true,
          puerto
        });
      }
    }

    return exits.noDisponible({
      ok: false,
      mensaje: 'No se encontró puerto libre.'
    });
  }

};