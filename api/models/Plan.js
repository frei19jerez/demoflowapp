/**
 * Plan.js
 */

module.exports = {

  tableName: 'planes',
  primaryKey: 'id',

  attributes: {

    // ======================
    // ID
    // ======================

    id: {
      type: 'number',
      autoIncrement: true
    },

    // ======================
    // NOMBRE
    // ======================

    nombre: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 120
    },

    // ======================
    // SLUG
    // ======================

    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 80
    },

    // ======================
    // DESCRIPCIÓN
    // ======================

    descripcion: {
      type: 'string',
      allowNull: true,
      columnType: 'text'
    },

    // ======================
    // PRECIO
    // ======================

    precio: {
      type: 'number',
      defaultsTo: 0
    },

    // ======================
    // MONEDA
    // ======================

    moneda: {
      type: 'string',
      defaultsTo: 'COP'
    },

    // ======================
    // LÍMITES
    // ======================

    limiteProyectos: {
      type: 'number',
      defaultsTo: 1,
      columnName: 'limite_proyectos'
    },

    limiteDeploys: {
      type: 'number',
      defaultsTo: 1,
      columnName: 'limite_deploys'
    },

    almacenamientoMb: {
      type: 'number',
      defaultsTo: 100,
      columnName: 'almacenamiento_mb'
    },

    // ======================
    // CARACTERÍSTICAS
    // ======================

    soportePrioritario: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'soporte_prioritario'
    },

    accesoIA: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'acceso_ia'
    },

    deployNode: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'deploy_node'
    },

    deploySails: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'deploy_sails'
    },

    deployGit: {
      type: 'boolean',
      defaultsTo: true,
      columnName: 'deploy_git'
    },

    // ======================
    // ESTADO
    // ======================

    activo: {
      type: 'boolean',
      defaultsTo: true
    },

    // ======================
    // TIMESTAMPS
    // ======================

    createdAt: {
      type: 'number',
      autoCreatedAt: true,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'number',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }

  }

};