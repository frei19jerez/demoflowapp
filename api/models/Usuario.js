const bcrypt = require('bcryptjs');
const _ = require('@sailshq/lodash');

module.exports = {
  tableName: 'usuarios',
  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    nombre: {
      type: 'string',
      required: true,
      maxLength: 120
    },

    email: {
      type: 'string',
      required: true,
      unique: true,
      isEmail: true,
      maxLength: 150
    },

    password: {
      type: 'string',
      required: true,
      columnType: 'varchar(255)'
    },

    rol: {
      type: 'string',
      allowNull: true,
      columnType: 'varchar(50)',
      defaultsTo: 'programador'
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

  },

  customToJSON: function() {
    return _.omit(this, ['password']);
  },

  beforeCreate: async function(valuesToSet, proceed) {
    try {
      if (valuesToSet.password) {
        const hash = await bcrypt.hash(valuesToSet.password, 10);
        valuesToSet.password = hash;
      }
      return proceed();
    } catch (err) {
      return proceed(err);
    }
  }
};