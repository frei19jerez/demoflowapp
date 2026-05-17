module.exports = {

  friendlyName: 'Limpiar ruta',

  description: 'Limpia una ruta o nombre para usarlo como carpeta o segmento seguro.',

  inputs: {
    texto: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Texto limpio correctamente.'
    }
  },

  fn: async function (inputs, exits) {
    const limpio = inputs.texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-_./]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return exits.success({
      ok: true,
      original: inputs.texto,
      limpio
    });
  }

};