module.exports = {

  datastores: {

    default: {

      adapter: 'sails-postgresql',

      url: process.env.DATABASE_URL ||

        'postgresql://postgres:123456@localhost:5432/demoflow',

      ssl: false

    }

  }

};