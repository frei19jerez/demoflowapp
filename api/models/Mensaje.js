/**
 * Mensaje.js
 * Mensajes entre usuarios dentro de DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'mensajes',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    remitente: {
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

    asunto: {
      type: 'string',
      maxLength: 180,
      allowNull: true
    },

    contenido: {
      type: 'string',
      columnType: 'text',
      required: true
    },

    leido: {
      type: 'boolean',
      defaultsTo: false
    },

    fechaLectura: {
      type: 'ref',
      columnType: 'timestamp'
    },

    estado: {
      type: 'string',
      isIn: [
        'enviado',
        'leido',
        'archivado'
      ],
      defaultsTo: 'enviado'
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