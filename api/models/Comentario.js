module.exports = {
  tableName: 'comentarios',
  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    contenido: {
      type: 'string',
      required: true,
      columnType: 'text'
    },

    proyecto: {
      model: 'proyecto',
      columnName: 'proyecto_id'
    },

    usuario: {
      model: 'usuario',
      columnName: 'usuario_id'
    },

    activo: {
      type: 'boolean',
      defaultsTo: true
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