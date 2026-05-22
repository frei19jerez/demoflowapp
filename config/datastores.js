/**
 * Datastores
 * (sails.config.datastores)
 *
 * Base de datos real para DemoFlow
 */

module.exports.datastores = {

  default: {

    adapter: 'sails-postgresql',

    url: process.env.DATABASE_URL,

    ssl: {
      rejectUnauthorized: false
    }

  }

};