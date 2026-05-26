/**
 * IAHistorial.js
 * Historial IA DemoFlow
 */

module.exports = {

  tableName: 'ia_historial',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true,
      columnName: 'id'
    },

    usuario: {
      model: 'usuario',
      required: true,
      columnName: 'usuario'
    },

    proyecto: {
      model: 'proyecto',
      columnName: 'proyecto'
    },

    tipo: {
      type: 'string',
      defaultsTo: 'dashboard',
      columnName: 'tipo'
    },

    resultado: {
      type: 'json',
      columnName: 'resultado'
    },

    creditosUsados: {
      type: 'number',
      defaultsTo: 1,
      columnName: 'creditos_usados'
    },

    createdAt: {
      type: 'ref',
      autoCreatedAt: true,
      columnType: 'timestamp',
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'ref',
      autoUpdatedAt: true,
      columnType: 'timestamp',
      columnName: 'updated_at'
    }

  }

};