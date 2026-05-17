const fs = require('fs');

module.exports = {

  friendlyName: 'Eliminar app',

  description: 'Elimina una carpeta de aplicación.',

  inputs: {
    ruta: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Carpeta eliminada.'
    },
    errorDelete: {
      description: 'No se pudo eliminar la carpeta.'
    }
  },

  fn: async function (inputs, exits) {
    try {
      if (fs.existsSync(inputs.ruta)) {
        fs.rmSync(inputs.ruta, { recursive: true, force: true });
      }

      return exits.success({
        ok: true,
        mensaje: 'Carpeta eliminada correctamente.'
      });
    } catch (error) {
      return exits.errorDelete(error);
    }
  }

};