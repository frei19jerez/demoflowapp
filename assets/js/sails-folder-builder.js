window.crearZipSailsLimpio = function (archivos) {
  return new Promise(function (resolve, reject) {
    try {
      console.log('🤖 IA DemoFlow: Iniciando limpieza inteligente de carpeta Sails...');

      if (!archivos || archivos.length === 0) {
        return reject(
          new Error('No seleccionaste archivos de la carpeta Sails.')
        );
      }

      if (typeof JSZip === 'undefined') {
        return reject(
          new Error('JSZip no está cargado.')
        );
      }

      var zip = new JSZip();

      var ignorar = [
        'node_modules/',
        '.git/',
        '.tmp/',
        '.vscode/',
        'uploads/',
        'coverage/',
        'test/',
        'tests/',
        'spec/',
        'logs/',
        '.cache/',
        '.DS_Store'
      ];

      var total = archivos.length;
      var incluidos = 0;
      var ignorados = 0;
      var pesados = 0;

      for (var i = 0; i < archivos.length; i++) {
        var archivo = archivos[i];

        var ruta = (
          archivo.webkitRelativePath ||
          archivo.name
        ).replace(/\\/g, '/');

        var rutaLower = ruta.toLowerCase();

        var ignorarArchivo = ignorar.some(function (carpeta) {
          return rutaLower.indexOf(carpeta.toLowerCase()) !== -1;
        });

        if (ignorarArchivo) {
          ignorados++;
          continue;
        }

        if (archivo.size > 100 * 1024 * 1024) {
          pesados++;
          continue;
        }

        zip.file(ruta, archivo);
        incluidos++;
      }

      console.log('🤖 IA DemoFlow: Archivos revisados:', total);
      console.log('✅ IA DemoFlow: Archivos incluidos:', incluidos);
      console.log('🧹 IA DemoFlow: Archivos ignorados:', ignorados);
      console.log('⚠️ IA DemoFlow: Archivos pesados omitidos:', pesados);

      if (incluidos === 0) {
        return reject(
          new Error('IA DemoFlow no encontró archivos válidos para comprimir.')
        );
      }

      zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6
          }
        },
        function (metadata) {
          console.log(
            '🤖 IA DemoFlow: Comprimiendo ZIP limpio ' +
            Math.round(metadata.percent) +
            '%'
          );
        }
      )
      .then(function (blob) {
        var nombreZip = 'sails-limpio-' + Date.now() + '.zip';

        console.log('✅ IA DemoFlow: ZIP limpio creado:', nombreZip);

        var archivoZip = new File(
          [blob],
          nombreZip,
          {
            type: 'application/zip'
          }
        );

        resolve(archivoZip);
      })
      .catch(function (error) {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};