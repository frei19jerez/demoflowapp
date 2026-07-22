/**
 * CategoriaProyecto.js
 * Categorías para organizar los proyectos de DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'categorias_proyecto',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    nombre: {
      type: 'string',
      required: true,
      maxLength: 120
    },

    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 140
    },

    descripcion: {
      type: 'string',
      allowNull: true,
      columnType: 'text'
    },

    icono: {
      type: 'string',
      allowNull: true,
      maxLength: 100
    },

    activa: {
      type: 'boolean',
      defaultsTo: true
    },

    orden: {
      type: 'number',
      defaultsTo: 0
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