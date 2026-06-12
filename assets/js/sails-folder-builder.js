window.crearZipSailsLimpio = async function (archivos) {
  console.log('🤖 IA DemoFlow: Escaneando app Sails...');

  if (!archivos || archivos.length === 0) {
    throw new Error('No seleccionaste archivos de la carpeta Sails.');
  }

  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip no está cargado.');
  }

  var zip = new JSZip();

  var carpetasPermitidas = [
    'api/',
    'assets/',
    'config/',
    'tasks/',
    'views/',
    'scripts/',
    'db/',
    'lib/'
  ];

  var archivosPermitidos = [
    'app.js',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    '.sailsrc',
    'Gruntfile.js',
    'README.md'
  ];

  var extensionesPesadas = [
    '.mp4', '.mov', '.avi', '.mkv', '.webm',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.log', '.tmp',
    '.psd', '.ai'
  ];

  var carpetasBloqueadas = [
    'node_modules/',
    '.git/',
    '.tmp/',
    'uploads/',
    'logs/',
    'coverage/',
    'test/',
    'tests/',
    'spec/',
    '.cache/',
    '.vscode/',
    '.idea/'
  ];

  var total = archivos.length;
  var incluidos = 0;
  var ignorados = 0;
  var pesados = 0;

  for (var i = 0; i < archivos.length; i++) {
    var archivo = archivos[i];

    var rutaOriginal = (
      archivo.webkitRelativePath ||
      archivo.name
    ).replace(/\\/g, '/');

    var partes = rutaOriginal.split('/');

    if (partes.length > 1) {
      partes.shift();
    }

    var ruta = partes.join('/');
    var nombreArchivo = partes[partes.length - 1];

    if (!ruta || !nombreArchivo) {
      ignorados++;
      continue;
    }

    var rutaLower = ruta.toLowerCase();
    var nombreLower = nombreArchivo.toLowerCase();

    var estaBloqueado = carpetasBloqueadas.some(function (carpeta) {
      return rutaLower.indexOf(carpeta.toLowerCase()) !== -1;
    });

    if (estaBloqueado) {
      ignorados++;
      continue;
    }

    var esPesado = extensionesPesadas.some(function (ext) {
      return nombreLower.endsWith(ext);
    });

    if (esPesado || archivo.size > 80 * 1024 * 1024) {
      pesados++;
      continue;
    }

    var esCarpetaPermitida = carpetasPermitidas.some(function (carpeta) {
      return rutaLower.indexOf(carpeta.toLowerCase()) === 0;
    });

    var esArchivoRaizPermitido = archivosPermitidos.some(function (permitido) {
      return ruta === permitido;
    });

    if (!esCarpetaPermitida && !esArchivoRaizPermitido) {
      ignorados++;
      continue;
    }

    zip.file(ruta, archivo);
    incluidos++;

    if (incluidos % 300 === 0) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 0);
      });
    }
  }

  console.log('🤖 IA DemoFlow: Archivos revisados:', total);
  console.log('✅ IA DemoFlow: Archivos incluidos:', incluidos);
  console.log('🧹 IA DemoFlow: Archivos ignorados:', ignorados);
  console.log('⚠️ IA DemoFlow: Pesados omitidos:', pesados);

  if (incluidos === 0) {
    throw new Error('IA DemoFlow no encontró archivos esenciales de Sails para subir.');
  }

  var blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 5
    }
  }, function (metadata) {
    console.log(
      '🤖 IA DemoFlow: Optimizando ZIP limpio ' +
      Math.round(metadata.percent) +
      '%'
    );
  });

  var nombreZip = 'demoflow-sails-limpio-' + Date.now() + '.zip';

  console.log('✅ IA DemoFlow: ZIP IA creado:', nombreZip);
  console.log('📦 Tamaño ZIP IA:', Math.round(blob.size / 1024 / 1024) + ' MB');

  return new File(
    [blob],
    nombreZip,
    {
      type: 'application/zip'
    }
  );
};