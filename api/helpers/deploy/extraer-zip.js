const fs = require('fs');
const unzipper = require('unzipper');

module.exports = {

  friendlyName: 'Extraer zip',

  description: 'Extrae un archivo ZIP en una carpeta destino.',

  inputs: {
    origen: {
      type: 'string',
      required: true
    },
    destino: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'ZIP extraído correctamente.'
    },
    errorZip: {
      description: 'No se pudo extraer el ZIP.'
    }
  },

  fn: async function (inputs, exits) {
    try {
      if (!fs.existsSync(inputs.destino)) {
        fs.mkdirSync(inputs.destino, { recursive: true });
      }

      await fs
        .createReadStream(inputs.origen)
        .pipe(unzipper.Extract({ path: inputs.destino }))
        .promise();

      return exits.success({
        ok: true,
        mensaje: 'ZIP extraído correctamente.'
      });
    } catch (error) {
      return exits.errorZip(error);
    }
  }

};