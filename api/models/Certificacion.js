/**
 * Certificacion.js
 * Certificaciones DemoFlow IA.
 */

'use strict';

module.exports = {

  tableName: 'certificaciones',

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

    proyecto: {
      model: 'proyecto'
    },

    nombre: {
      type: 'string',
      required: true,
      maxLength: 150
    },

    descripcion: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    },

    nivel: {
      type: 'string',
      isIn: [
        'basico',
        'intermedio',
        'avanzado',
        'profesional'
      ],
      defaultsTo: 'basico'
    },

    puntuacion: {
      type: 'number',
      defaultsTo: 0
    },

    estado: {
      type: 'string',
      isIn: [
        'pendiente',
        'aprobada',
        'rechazada'
      ],
      defaultsTo: 'pendiente'
    },

    codigo: {
      type: 'string',
      unique: true,
      allowNull: true
    },

    fechaExpedicion: {
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