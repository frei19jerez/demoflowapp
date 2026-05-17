module.exports = {

  friendlyName: 'Generar slug',

  description: 'Genera un slug limpio a partir de un texto.',

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

  fn: async function (inputs, exits) {
    const slug = inputs.texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return exits.success({
      ok: true,
      slug
    });
  }

};