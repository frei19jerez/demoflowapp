/**
 * Datastores
 * (sails.config.datastores)
 *
 * Base de datos real para DemoFlow
 */

module.exports.datastores = {

  default: {

    adapter: 'sails-postgresql',

    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/demoflow',

    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false

  }

};