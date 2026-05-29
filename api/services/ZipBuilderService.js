const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

module.exports = {

  crearZipInteligente: async function ({
    carpetaOrigen,
    nombreProyecto
  }) {

    try {

      const carpetaZips = path.resolve(
        sails.config.appPath,
        '.tmp',
        'zips'
      );

      if (!fs.existsSync(carpetaZips)) {
        fs.mkdirSync(carpetaZips, {
          recursive: true
        });
      }

      const rutaZip = path.join(
        carpetaZips,
        `${nombreProyecto}.zip`
      );

      // eliminar zip anterior
      if (fs.existsSync(rutaZip)) {
        fs.unlinkSync(rutaZip);
      }

      const output = fs.createWriteStream(rutaZip);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.pipe(output);

      // =====================================
      // 🚫 IGNORAR BASURA PESADA
      // =====================================

      archive.glob('**/*', {

        cwd: carpetaOrigen,

        ignore: [

          '**/node_modules/**',

          '**/.git/**',

          '**/.tmp/**',

          '**/.vscode/**',

          '**/uploads/**',

          '**/.DS_Store',

          '**/Thumbs.db'

        ]

      });

      await archive.finalize();

      sails.log.info(
        `🤖 ZIP inteligente creado: ${rutaZip}`
      );

      return {
        ok: true,
        rutaZip
      };

    } catch (error) {

      sails.log.error(
        '❌ Error creando ZIP inteligente'
      );

      sails.log.error(error);

      return {
        ok: false,
        error: error.message
      };

    }

  }

};