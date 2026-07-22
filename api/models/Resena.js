/**
 * Resena.js
 * Reseñas y calificaciones entre usuarios de DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'resenas',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    autor: {
      model: 'usuario',
      required: true
    },

    destinatario: {
      model: 'usuario',
      required: true
    },

    contratacion: {
      model: 'contratacion'
    },

    proyecto: {
      model: 'proyecto'
    },

    titulo: {
      type: 'string',
      maxLength: 180,
      allowNull: true
    },

    comentario: {
      type: 'string',
      columnType: 'text',
      required: true
    },

    calificacion: {
      type: 'number',
      min: 1,
      max: 5,
      required: true
    },

    estado: {
      type: 'string',
      isIn: [
        'pendiente',
        'publicada',
        'oculta',
        'rechazada'
      ],
      defaultsTo: 'publicada'
    },

    respuesta: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    },

    fechaRespuesta: {
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