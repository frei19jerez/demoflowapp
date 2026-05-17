module.exports = {

  friendlyName: 'Crear ruta demo',

  description: 'Crea la ruta pública de una demo a partir de una carpeta.',

  inputs: {
    carpeta: {
      type: 'string',
      required: true
    },
    tipoProyecto: {
      type: 'string',
      allowNull: true
    }
  },

  exits: {
    success: {
      description: 'Ruta demo creada correctamente.'
    }
  },

  fn: async function (inputs, exits) {
    const carpeta = inputs.carpeta.trim();

    let ruta = `/demos/${carpeta}/index.html`;

    if (inputs.tipoProyecto === 'externo') {
      ruta = '';
    }

    return exits.success({
      ok: true,
      ruta
    });
  }

};