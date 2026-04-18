module.exports = {

  friendlyName: 'Detectar tipo demo',

  description: 'Detecta el tipo de demo según su contenido o extensión.',

  inputs: {
    nombre: {
      type: 'string',
      required: true
    }
  },

  exits: {
    success: {
      description: 'Tipo detectado correctamente.'
    }
  },

  fn: async function (inputs) {
    const nombre = inputs.nombre.toLowerCase();

    if (nombre.includes('sails')) {
      return 'sails';
    }

    if (nombre.includes('node')) {
      return 'node';
    }

    if (nombre.includes('html')) {
      return 'html';
    }

    return 'otro';
  }

};