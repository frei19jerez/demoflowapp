/**
 * DeployService.js
 * Servicio central para deploys de DemoFlow
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { exec } = require('child_process');

function ejecutar(comando, cwd) {
  return new Promise((resolve) => {
    exec(comando, { cwd, timeout: 300000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        error,
        stdout,
        stderr
      });
    });
  });
}

module.exports = {

  puertoAleatorio: function () {
    return Math.floor(4100 + Math.random() * 900);
  },

  limpiarSlug: function (valor) {
    return String(valor || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  existe: async function (ruta) {
    try {
      await fsp.access(ruta);
      return true;
    } catch (err) {
      return false;
    }
  },

  detectarTipo: async function (carpeta) {
    const packageJson = path.join(carpeta, 'package.json');
    const appJs = path.join(carpeta, 'app.js');
    const serverJs = path.join(carpeta, 'server.js');
    const indexHtml = path.join(carpeta, 'index.html');
    const routesJs = path.join(carpeta, 'config', 'routes.js');

    if (await this.existe(packageJson)) {
      const contenido = await fsp.readFile(packageJson, 'utf8');

      if (contenido.includes('sails') || await this.existe(routesJs)) {
        return {
          tipo: 'sails',
          comando: 'node app.js',
          entrada: 'app.js'
        };
      }

      if (await this.existe(serverJs)) {
        return {
          tipo: 'node',
          comando: 'node server.js',
          entrada: 'server.js'
        };
      }

      if (await this.existe(appJs)) {
        return {
          tipo: 'node',
          comando: 'node app.js',
          entrada: 'app.js'
        };
      }

      return {
        tipo: 'node',
        comando: 'npm start',
        entrada: 'package.json'
      };
    }

    if (await this.existe(indexHtml)) {
      return {
        tipo: 'html',
        comando: '',
        entrada: 'index.html'
      };
    }

    return {
      tipo: 'externo',
      comando: '',
      entrada: ''
    };
  },

  instalarDependencias: async function (carpeta) {
    sails.log.info('📦 IA DemoFlow: Instalando dependencias en:', carpeta);
    return await ejecutar('npm install', carpeta);
  },

  iniciarConPM2: async function ({ carpeta, nombrePM2, comando, puerto }) {
    const envPort = `PORT=${puerto}`;
    const finalCommand = `${envPort} pm2 start ${comando} --name ${nombrePM2}`;

    sails.log.info('🚀 IA DemoFlow: Iniciando con PM2:', finalCommand);

    return await ejecutar(finalCommand, carpeta);
  },

  detenerPM2: async function (nombrePM2) {
    return await ejecutar(`pm2 delete ${nombrePM2}`, process.cwd());
  },

  reiniciarPM2: async function (nombrePM2) {
    return await ejecutar(`pm2 restart ${nombrePM2}`, process.cwd());
  },

  verificarPuerto: async function (puerto) {
    return await ejecutar(`curl -I http://127.0.0.1:${puerto}`, process.cwd());
  },

  rutaRuntime: function (slug) {
    return path.join(process.cwd(), 'deploy_runtime', 'apps', slug);
  }

};