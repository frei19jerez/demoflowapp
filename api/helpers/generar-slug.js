module.exports = {

  friendlyName: 'Generar slug',

  description: 'Convierte un texto en slug amigable.',

  inputs: {
    texto: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Slug generado correctamente.'
    }
  },

  fn: async function (inputs) {
    return inputs.texto
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

};