/**
 * UsuarioTecnologia.js
 * Relación entre usuarios y tecnologías en DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'usuario_tecnologias',

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

    tecnologia: {
      model: 'tecnologia',
      required: true
    },

    nivel: {
      type: 'string',
      isIn: ['principiante', 'intermedio', 'avanzado', 'experto'],
      defaultsTo: 'principiante'
    },

    aniosExperiencia: {
      type: 'number',
      defaultsTo: 0,
      min: 0
    },

    certificada: {
      type: 'boolean',
      defaultsTo: false
    },

    principal: {
      type: 'boolean',
      defaultsTo: false
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