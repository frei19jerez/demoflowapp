/**
 * Favorito.js
 * Proyectos guardados como favoritos por los usuarios.
 */

'use strict';

module.exports = {

  tableName: 'favoritos',

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
      model: 'proyecto',
      required: true
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