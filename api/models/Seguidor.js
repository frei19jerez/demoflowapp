/**
 * Seguidor.js
 * Relación de seguimiento entre usuarios de DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'seguidores',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    seguidor: {
      model: 'usuario',
      required: true
    },

    seguido: {
      model: 'usuario',
      required: true
    },

    activo: {
      type: 'boolean',
      defaultsTo: true
    },

    notificaciones: {
      type: 'boolean',
      defaultsTo: true
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