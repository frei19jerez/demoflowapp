window.crearZipSailsLimpio = async function (archivos) {
  if (!archivos || archivos.length === 0) {
    throw new Error('No seleccionaste archivos de la carpeta Sails.');
  }

  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip no está cargado.');
  }

  const zip = new JSZip();

  const ignorar = [
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

  for (const archivo of archivos) {
    const ruta = (archivo.webkitRelativePath || archivo.name).replace(/\\/g, '/');

    if (ignorar.some(carpeta => ruta.includes(carpeta))) {
      continue;
    }

    if (archivo.size > 100 * 1024 * 1024) {
      continue;
    }

    zip.file(ruta, archivo);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return new File([blob], 'sails-limpio.zip', {
    type: 'application/zip'
  });
};