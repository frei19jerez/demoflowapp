module.exports = {

  friendlyName: 'Detectar tipo demo',

  description: 'Detecta si una ruta demo es externa, interna o vacía.',

  inputs: {
    urlDemo: {
      type: 'string',
      allowNull: true
    }
  },

  exits: {
    success: {
      description: 'Tipo demo detectado correctamente.'
    }
  },

  fn: async function (inputs, exits) {
    const valor = (inputs.urlDemo || '').trim();

    if (!valor) {
      return exits.success({
        ok: true,
        tipo: 'vacio'
      });
    }

    if (
      valor.startsWith('http://') ||
      valor.startsWith('https://')
    ) {
      return exits.success({
        ok: true,
        tipo: 'externo'
      });
    }

    if (
      valor.startsWith('/demo/') ||
      valor.startsWith('/demos/') ||
      valor.startsWith('/')
    ) {
      return exits.success({
        ok: true,
        tipo: 'interno'
      });
    }

    return exits.success({
      ok: true,
      tipo: 'desconocido'
    });
  }

};