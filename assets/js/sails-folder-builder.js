window.crearZipSailsLimpio = async function (archivos) {
  if (!archivos || archivos.length === 0) {
    throw new Error('No seleccionaste archivos de la carpeta Sails.');
  }

  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip no está cargado. Revisa el script de JSZip en nuevo.ejs.');
  }

  const zip = new JSZip();

  const ignorarCarpetas = [
    'node_modules/',
    '.git/',
    '.tmp/',
    '.vscode/',
    'uploads/',
    'coverage/',
    'test/',
    'tests/',
    'spec/'
  ];

  const ignorarArchivos = [
    '.DS_Store',
    'Thumbs.db',
    'package-lock.json',
    'yarn.lock'
  ];

  for (const archivo of archivos) {
    const ruta = archivo.webkitRelativePath || archivo.name;
    const rutaNormalizada = ruta.replace(/\\/g, '/');

    const ignoradoPorCarpeta = ignorarCarpetas.some(function (carpeta) {
      return rutaNormalizada.includes('/' + carpeta) ||
             rutaNormalizada.startsWith(carpeta);
    });

    const nombreArchivo = rutaNormalizada.split('/').pop();

    const ignoradoPorArchivo = ignorarArchivos.includes(nombreArchivo);

    if (ignoradoPorCarpeta || ignoradoPorArchivo) {
      continue;
    }

    if (archivo.size > 100 * 1024 * 1024) {
      continue;
    }

    zip.file(rutaNormalizada, archivo);
  }

  const contenidoZip = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });

  return new File(
    [contenidoZip],
    'sails-limpio.zip',
    {
      type: 'application/zip'
    }
  );
};