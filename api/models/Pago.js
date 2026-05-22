module.exports = {

  tableName: 'pagos',
  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    // ======================
    // USUARIO
    // ======================

    usuario: {
      model: 'usuario',
      required: true,
      columnName: 'usuario_id'
    },

    // ======================
    // MÉTODO
    // ======================

    metodo: {
      type: 'string',
      isIn: [
        'nequi',
        'paypal',
        'banco_bogota'
      ],
      required: true
    },

    // ======================
    // PLAN
    // ======================

    plan: {
      type: 'string',
      isIn: [
        'free',
        'pro',
        'empresa'
      ],
      defaultsTo: 'pro'
    },

    // ======================
    // VALOR
    // ======================

    valor: {
      type: 'number',
      required: true
    },

    // ======================
    // REFERENCIA
    // ======================

    referencia: {
      type: 'string',
      allowNull: true,
      maxLength: 200
    },

    // ======================
    // ESTADO
    // ======================

    estado: {
      type: 'string',
      isIn: [
        'pendiente',
        'aprobado',
        'rechazado'
      ],
      defaultsTo: 'pendiente'
    },

    // ======================
    // TIMESTAMPS
    // ======================

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