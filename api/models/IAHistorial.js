/**
 * IAHistorial.js
 * Historial IA DemoFlow
 */

module.exports = {

  tableName: 'ia_historial',

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