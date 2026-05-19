const { exec } = require('child_process');

module.exports = {
  levantar: async function ({ appPath, appName, puerto, databaseUrl }) {
    return new Promise((resolve, reject) => {
      const comando =
        `cd "${appPath}" && ` +
        `pm2 delete "${appName}" || true && ` +
        `DATABASE_URL="${databaseUrl}" PORT=${puerto} NODE_ENV=production ` +
        `pm2 start app.js --name "${appName}" --update-env`;

      exec(comando, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        return resolve(stdout);
      });
    });
  },

  detener: async function (appName) {
    return new Promise((resolve, reject) => {
      exec(`pm2 delete "${appName}" || true`, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        return resolve(stdout);
      });
    });
  }
};