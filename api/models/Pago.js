module.exports = {
  tableName: 'pagos',
  primaryKey: 'id',

  attributes: {
    id: {
      type: 'number',
      autoIncrement: true
    },

    usuario: {
      model: 'usuario',
      columnName: 'usuario_id'
    },

    metodo: {
      type: 'string',
      isIn: ['nequi', 'paypal', 'banco_bogota'],
      required: true
    },

    plan: {
      type: 'string',
      isIn: ['free', 'pro', 'empresa'],
      defaultsTo: 'pro'
    },

    valor: {
      type: 'number',
      required: true
    },

    referencia: {
      type: 'string',
      allowNull: true
    },

    estado: {
      type: 'string',
      isIn: ['pendiente', 'aprobado', 'rechazado'],
      defaultsTo: 'pendiente'
    },

    createdAt: {
      type: 'number',
      autoCreatedAt: true,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'number',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }
  }
};