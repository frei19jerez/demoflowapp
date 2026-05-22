/**
 * Suscripcion.js
 */

module.exports = {

  tableName: 'suscripciones',
  primaryKey: 'id',

  attributes: {

    // ======================
    // PRIMES
    // ======================

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
    // PLAN
    // ======================

    plan: {
      type: 'string',
      isIn: ['free', 'pro', 'empresa'],
      defaultsTo: 'free'
    },

    // ======================
    // ESTADO
    // ======================

    estado: {
      type: 'string',
      isIn: ['activa', 'pendiente', 'cancelada'],
      defaultsTo: 'pendiente'
    },

    // ======================
    // MÉTODO DE PAGO
    // ======================

    metodoPago: {
      type: 'string',
      allowNull: true,
      isIn: ['nequi', 'paypal', 'banco_bogota'],
      columnName: 'metodo_pago'
    },

    // ======================
    // VALOR
    // ======================

    valor: {
      type: 'number',
      defaultsTo: 0
    },

    // ======================
    // REFERENCIA
    // ======================

    referencia: {
      type: 'string',
      allowNull: true
    },

    // ======================
    // FECHAS
    // ======================

    fechaInicio: {
      type: 'number',
      allowNull: true,
      columnName: 'fecha_inicio'
    },

    fechaFin: {
      type: 'number',
      allowNull: true,
      columnName: 'fecha_fin'
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