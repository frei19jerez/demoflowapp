module.exports.datastores = {

  default: {
    adapter: 'sails-postgresql',
    url: process.env.DATABASE_URL,

    ssl: process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false
        }
      : false
  }

};