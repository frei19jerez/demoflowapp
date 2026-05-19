module.exports = {

  tableName: 'proyecto_runtime',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    proyecto: {
      model: 'proyecto',
      required: true
    },

    puerto: {
      type: 'number',
      required: true
    },

    databaseName: {
      type: 'string',
      required: true
    },

    databaseUrl: {
      type: 'string',
      required: true
    },

    pm2Name: {
      type: 'string',
      required: true
    },

    estado: {
      type: 'string',
      isIn: ['online', 'offline', 'error'],
      defaultsTo: 'offline'
    },

    urlRuntime: {
      type: 'string',
      allowNull: true
    },

    log: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    }

  }

};