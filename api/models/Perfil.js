/**
 * Perfil.js
 * Perfil público del desarrollador en DemoFlowApp.
 */

'use strict';

module.exports = {

  tableName: 'perfiles',

  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    usuario: {
      model: 'usuario',
      required: true,
      unique: true
    },

    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 160
    },

    nombrePublico: {
      type: 'string',
      maxLength: 160,
      allowNull: true
    },

    tituloProfesional: {
      type: 'string',
      maxLength: 180,
      allowNull: true
    },

    biografia: {
      type: 'string',
      columnType: 'text',
      allowNull: true
    },

    foto: {
      type: 'string',
      allowNull: true
    },

    portada: {
      type: 'string',
      allowNull: true
    },

    ciudad: {
      type: 'string',
      maxLength: 120,
      allowNull: true
    },

    pais: {
      type: 'string',
      maxLength: 120,
      allowNull: true
    },

    github: {
      type: 'string',
      allowNull: true
    },

    linkedin: {
      type: 'string',
      allowNull: true
    },

    sitioWeb: {
      type: 'string',
      allowNull: true
    },

    whatsapp: {
      type: 'string',
      allowNull: true
    },

    tecnologias: {
      type: 'json',
      defaultsTo: []
    },

    servicios: {
      type: 'json',
      defaultsTo: []
    },

    disponibleFreelance: {
      type: 'boolean',
      defaultsTo: false
    },

    perfilPublico: {
      type: 'boolean',
      defaultsTo: true
    },

    visitas: {
      type: 'number',
      defaultsTo: 0
    },

    reputacion: {
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