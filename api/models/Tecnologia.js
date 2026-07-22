/**
 * Tecnologia.js
 * Tecnologías disponibles en DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'tecnologias',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    nombre: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 100
    },

    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 120
    },

    descripcion: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    },

    icono: {
      type: 'string',
      allowNull: true
    },

    color: {
      type: 'string',
      allowNull: true
    },

    categoria: {
      type: 'string',
      allowNull: true
    },

    activa: {
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