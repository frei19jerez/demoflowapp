/**
 * ServicioFreelancer.js
 * Servicios profesionales ofrecidos por los desarrolladores en DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'servicios_freelancer',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    usuario: {
      model: 'usuario',
      required: true
    },

    titulo: {
      type: 'string',
      required: true,
      maxLength: 180
    },

    descripcion: {
      type: 'string',
      columnType: 'text',
      required: true
    },

    categoria: {
      type: 'string',
      maxLength: 120,
      allowNull: true
    },

    precioDesde: {
      type: 'number',
      defaultsTo: 0
    },

    precioHasta: {
      type: 'number',
      defaultsTo: 0
    },

    moneda: {
      type: 'string',
      isIn: ['COP', 'USD', 'BTC'],
      defaultsTo: 'USD'
    },

    tiempoEntregaDias: {
      type: 'number',
      defaultsTo: 1
    },

    tecnologias: {
      type: 'json',
      defaultsTo: []
    },

    imagen: {
      type: 'string',
      allowNull: true
    },

    estado: {
      type: 'string',
      isIn: ['borrador', 'activo', 'pausado', 'inactivo'],
      defaultsTo: 'activo'
    },

    destacado: {
      type: 'boolean',
      defaultsTo: false
    },

    visitas: {
      type: 'number',
      defaultsTo: 0
    },

    contrataciones: {
      collection: 'contratacion',
      via: 'servicio'
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