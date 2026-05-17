module.exports = {

  friendlyName: 'Validar zip',

  description: 'Valida que el archivo tenga extensión .zip.',

  inputs: {
    nombreArchivo: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Archivo válido.'
    },
    invalido: {
      description: 'Archivo inválido.'
    }
  },

  fn: async function (inputs, exits) {
    const nombre = inputs.nombreArchivo.toLowerCase();

    if (!nombre.endsWith('.zip')) {
      return exits.invalido({
        ok: false,
        mensaje: 'El archivo no es .zip'
      });
    }

    return exits.success({
      ok: true,
      mensaje: 'Archivo zip válido'
    });
  }

};