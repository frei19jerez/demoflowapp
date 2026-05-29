const fs = require('fs');
const path = require('path');

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

      const archiverModule =
        await import('archiver');

      const archiver =
        archiverModule.default || archiverModule;

      if (fs.existsSync(rutaZip)) {
        fs.unlinkSync(rutaZip);
      }

      const output =
        fs.createWriteStream(rutaZip);

      const archive =
        archiver('zip', {
          zlib: { level: 9 }
        });

      archive.pipe(output);

      archive.glob('**/*', {
        cwd: carpetaOrigen,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.tmp/**',
          '**/.vscode/**',
          '**/uploads/**',
          '**/assets/uploads/**',
          '**/logs/**',
          '**/.env',
          '**/.DS_Store',
          '**/Thumbs.db',
          '**/*.mp4',
          '**/*.mov',
          '**/*.avi',
          '**/*.mkv'
        ]
      });

      await archive.finalize();

      return {
        ok: true,
        rutaZip
      };

    } catch (error) {

      sails.log.error('❌ Error creando ZIP inteligente');
      sails.log.error(error);

      return {
        ok: false,
        error: error.message
      };

    }

  }

};