/**
 * DeployService.js
 * Servicio central para deploys de DemoFlow IA
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

  iaNombre: 'DemoFlow IA',

  iaLog: function (mensaje, data = '') {
    sails.log.info(`🤖 IA DemoFlow: ${mensaje}`, data);
  },

  iaError: function (mensaje, data = '') {
    sails.log.error(`❌ IA DemoFlow: ${mensaje}`, data);
  },

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
    this.iaLog('Analizando estructura del proyecto...', carpeta);

    const packageJson = path.join(carpeta, 'package.json');
    const appJs = path.join(carpeta, 'app.js');
    const serverJs = path.join(carpeta, 'server.js');
    const indexJs = path.join(carpeta, 'index.js');
    const indexHtml = path.join(carpeta, 'index.html');
    const routesJs = path.join(carpeta, 'config', 'routes.js');

    if (await this.existe(packageJson)) {
      const contenido = await fsp.readFile(packageJson, 'utf8');

      if (contenido.includes('sails') || await this.existe(routesJs)) {
        this.iaLog('Tecnología detectada: Sails.js');

        return {
          tipo: 'sails',
          comando: 'node app.js',
          entrada: 'app.js',
          ia: 'Proyecto Sails.js detectado por IA'
        };
      }

      if (await this.existe(serverJs)) {
        this.iaLog('Tecnología detectada: Node.js con server.js');

        return {
          tipo: 'node',
          comando: 'node server.js',
          entrada: 'server.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      if (await this.existe(appJs)) {
        this.iaLog('Tecnología detectada: Node.js con app.js');

        return {
          tipo: 'node',
          comando: 'node app.js',
          entrada: 'app.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      if (await this.existe(indexJs)) {
        this.iaLog('Tecnología detectada: Node.js con index.js');

        return {
          tipo: 'node',
          comando: 'node index.js',
          entrada: 'index.js',
          ia: 'Proyecto Node.js detectado por IA'
        };
      }

      this.iaLog('Proyecto Node.js detectado con npm start');

      return {
        tipo: 'node',
        comando: 'npm start',
        entrada: 'package.json',
        ia: 'Proyecto Node.js con script npm start'
      };
    }

    if (await this.existe(indexHtml)) {
      this.iaLog('Tecnología detectada: HTML estático');

      return {
        tipo: 'html',
        comando: '',
        entrada: 'index.html',
        ia: 'Proyecto HTML estático detectado por IA'
      };
    }

    this.iaLog('Tipo externo detectado');

    return {
      tipo: 'externo',
      comando: '',
      entrada: '',
      ia: 'Proyecto externo detectado por IA'
    };
  },

  instalarDependencias: async function (carpeta) {
    this.iaLog('Instalando dependencias...', carpeta);
    return await ejecutar('npm install', carpeta);
  },

  iniciarConPM2: async function ({ carpeta, nombrePM2, comando, puerto }) {
    const finalCommand = `PORT=${puerto} pm2 start ${comando} --name ${nombrePM2}`;

    this.iaLog('Iniciando runtime con PM2...', finalCommand);

    return await ejecutar(finalCommand, carpeta);
  },

  detenerPM2: async function (nombrePM2) {
    this.iaLog('Deteniendo runtime PM2...', nombrePM2);
    return await ejecutar(`pm2 delete ${nombrePM2}`, process.cwd());
  },

  reiniciarPM2: async function (nombrePM2) {
    this.iaLog('Reiniciando runtime PM2...', nombrePM2);
    return await ejecutar(`pm2 restart ${nombrePM2}`, process.cwd());
  },

  verificarPuerto: async function (puerto) {
    this.iaLog('Verificando salud del runtime...', puerto);
    return await ejecutar(`curl -I http://127.0.0.1:${puerto}`, process.cwd());
  },

  analizarProyectoIA: async function (carpeta) {
    const tipo = await this.detectarTipo(carpeta);

    return {
      ok: true,
      motor: 'DemoFlow IA',
      mensaje: tipo.ia,
      tipo: tipo.tipo,
      entrada: tipo.entrada,
      comando: tipo.comando
    };
  },

  rutaRuntime: function (slug) {
    return path.join(process.cwd(), 'deploy_runtime', 'apps', slug);
  }

};