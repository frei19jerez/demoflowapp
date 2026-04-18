module.exports = {

  tableName: 'clientes',
  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    nombre: {
      type: 'string',
      required: true
    },

    empresa: {
      type: 'string',
      allowNull: true
    },

    email: {
      type: 'string',
      isEmail: true,
      allowNull: true
    },

    telefono: {
      type: 'string',
      allowNull: true
    },

    ciudad: {
      type: 'string',
      allowNull: true
    },

    pais: {
      type: 'string',
      defaultsTo: 'Colombia'
    },

    activo: {
      type: 'boolean',
      defaultsTo: true
    },

    proyectos: {
      collection: 'proyecto',
      via: 'cliente'
    },

    createdAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoCreatedAt: false,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoUpdatedAt: false,
      columnName: 'updated_at'
    }

  }

};