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
    // MÉTODO DE PAGO
    // ======================

    metodo: {
      type: 'string',
      isIn: [
        'manual',
        'nequi',
        'paypal',
        'bbva',
        'banco_bogota'
      ],
      defaultsTo: 'manual'
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
    // MONEDA
    // ======================

    moneda: {
      type: 'string',
      defaultsTo: 'COP'
    },

    // ======================
    // CRÉDITOS IA
    // ======================

    creditos: {
      type: 'number',
      defaultsTo: 0
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
    // FECHA APROBACIÓN
    // ======================

    fechaAprobacion: {
      type: 'number',
      allowNull: true,
      columnName: 'fecha_aprobacion'
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