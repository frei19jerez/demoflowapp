module.exports = {

  attributes: {

    usuario: {
      model: 'usuario',
      required: true
    },

    proyecto: {
      model: 'proyecto',
      allowNull: true
    },

    tipo: {
      type: 'string',
      defaultsTo: 'dashboard'
    },

    resultado: {
      type: 'json',
      columnType: 'json'
    },

    creditosUsados: {
      type: 'number',
      defaultsTo: 1
    }

  }

};