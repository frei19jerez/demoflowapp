/**
 * Contratacion.js
 * Solicitudes de contratación entre clientes y desarrolladores.
 */

'use strict';

module.exports = {

  tableName: 'contrataciones',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    cliente: {
      model: 'usuario',
      required: true
    },

    desarrollador: {
      model: 'usuario',
      required: true
    },

    proyecto: {
      model: 'proyecto'
    },

    servicio: {
      model: 'serviciofreelancer'
    },

    titulo: {
      type: 'string',
      required: true,
      maxLength: 180
    },

    descripcion: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    },

    presupuesto: {
      type: 'number',
      defaultsTo: 0
    },

    moneda: {
      type: 'string',
      isIn: ['COP', 'USD'],
      defaultsTo: 'COP'
    },

    estado: {
      type: 'string',
      isIn: [
        'pendiente',
        'aceptada',
        'rechazada',
        'en_proceso',
        'completada',
        'cancelada'
      ],
      defaultsTo: 'pendiente'
    },

    fechaInicio: {
      type: 'ref',
      columnType: 'timestamp'
    },

    fechaFinalizacion: {
      type: 'ref',
      columnType: 'timestamp'
    },

    createdAt: {
      type: 'number',
      autoCreatedAt: true
    },

    updatedAt: {
      type: 'number',
      autoUpdatedAt: true
    }

  }

};