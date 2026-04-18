module.exports = {

  friendlyName: 'Crear ruta demo',

  description: 'Construye la ruta pública de una demo.',

  inputs: {
    slug: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Ruta creada correctamente.'
    }
  },

  fn: async function (inputs) {
    return `/demos/${inputs.slug}/index.html`;
  }

};