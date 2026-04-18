module.exports.datastores = {

  default: {
    adapter: 'sails-postgresql',
    url: process.env.DATABASE_URL || 'postgresql://postgres:emily19kenia@localhost:5432/demoflow',
    ssl: process.env.DATABASE_URL
      ? { rejectUnauthorized: false }
      : false
  }

};