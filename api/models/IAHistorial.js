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
      allowNull: true,
      columnName: 'proyecto'
    },

    tipo: {
      type: 'string',
      defaultsTo: 'dashboard',
      columnName: 'tipo'
    },

    resultado: {
      type: 'json',
      columnType: 'jsonb',
      columnName: 'resultado'
    },

    creditosUsados: {
      type: 'number',
      defaultsTo: 1,
      columnName: 'creditos_usados'
    },

    createdAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoCreatedAt: true,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }

  }

};