function slugify(texto) {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function cambiarMetodoEntrada() {
    const metodo = document.getElementById('metodoEntrada').value;
    const bloqueZip = document.getElementById('bloqueZip');
    const bloqueGit = document.getElementById('bloqueGit');
    const bloqueExterno = document.getElementById('bloqueExterno');
    const tipoSelect = document.getElementById('tipoProyecto');

    bloqueZip.style.display = 'none';
    bloqueGit.style.display = 'none';
    bloqueExterno.style.display = 'none';

    if (metodo === 'zip') {
      bloqueZip.style.display = 'block';
      tipoSelect.innerHTML = `
        <option value="html">Página HTML</option>
        <option value="node">Aplicación Node.js</option>
        <option value="sails">Aplicación Sails.js</option>
      `;
      tipoSelect.value = 'html';
    }

    if (metodo === 'git') {
      bloqueGit.style.display = 'block';
      tipoSelect.innerHTML = `
        <option value="node">Aplicación Node.js</option>
        <option value="sails">Aplicación Sails.js</option>
        <option value="html">Página HTML</option>
      `;
      tipoSelect.value = 'node';
    }

    if (metodo === 'externo') {
      bloqueExterno.style.display = 'block';
      tipoSelect.innerHTML = `
        <option value="externo">Demostración externa</option>
      `;
      tipoSelect.value = 'externo';
    }

    cambiarTipoProyecto();
  }

  function cambiarTipoProyecto() {

  const tipo = document.getElementById('tipoProyecto').value;
  const metodo = document.getElementById('metodoEntrada').value;

  const bloqueRuntime =
    document.getElementById('bloqueRuntime');

  const bloqueCarpetaDemo =
    document.getElementById('bloqueCarpetaDemo');

  const ayudaArchivo =
    document.getElementById('ayudaArchivo');

  const tecnologia =
    document.getElementById('tecnologia');

  const selectorCarpetaSails =
    document.getElementById('selectorCarpetaSails');

  // =====================================
  // REINICIAR
  // =====================================

  bloqueRuntime.style.display = 'none';

  if (bloqueCarpetaDemo) {
    bloqueCarpetaDemo.style.display = 'none';
  }

  if (selectorCarpetaSails) {
    selectorCarpetaSails.style.display = 'none';
  }

  // =====================================
  // HTML
  // =====================================

  if (tipo === 'html') {

    if (bloqueCarpetaDemo) {
      bloqueCarpetaDemo.style.display = 'block';
    }

    if (ayudaArchivo) {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.html</strong> o un <strong>.zip</strong> con tu proyecto estático.';
    }

    tecnologia.value =
      'HTML + CSS + JavaScript';
  }

  // =====================================
  // NODE
  // =====================================

  if (tipo === 'node') {

    bloqueRuntime.style.display = 'block';

    tecnologia.value =
      'Node.js';

    if (ayudaArchivo && metodo === 'zip') {

      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Node.js.';

    }

  }

  // =====================================
  // SAILS
  // =====================================

  if (tipo === 'sails') {

    bloqueRuntime.style.display = 'block';

    if (selectorCarpetaSails) {
      selectorCarpetaSails.style.display = 'block';
    }

    tecnologia.value =
      'Sails.js + Node.js + PostgreSQL';

    if (ayudaArchivo && metodo === 'zip') {

      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Sails.js o selecciona una carpeta completa.';

    }

  }

  // =====================================
  // EXTERNO
  // =====================================

  if (tipo === 'externo') {

    tecnologia.value =
      'Demo externa';

  }

}


  function mostrarNombreArchivo() {
    const input = document.getElementById('archivoDemo');
    const box = document.getElementById('nombreArchivoSeleccionado');

    if (input.files && input.files[0]) {
      const archivo = input.files[0];

      if (archivo.size > 2 * 1024 * 1024 * 1024) {
        alert('El archivo pesa más de 2GB.');
        input.value = '';
        box.style.display = 'none';
        return;
      }

      box.style.display = 'block';
      box.textContent = 'Archivo seleccionado: ' + archivo.name;

      const nombreBase = archivo.name.replace(/\.(zip|html|htm)$/i, '');
      const nombreInput = document.getElementById('nombre');
      const slugInput = document.getElementById('slug');
      const tipoSelect = document.getElementById('tipoProyecto');

      if (!nombreInput.value.trim()) nombreInput.value = nombreBase;
      if (!slugInput.value.trim()) slugInput.value = slugify(nombreBase);

      const lower = archivo.name.toLowerCase();

      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        tipoSelect.value = 'html';
      }

      cambiarTipoProyecto();
    }
  }

  document.getElementById('nombre').addEventListener('input', function () {
    const slugInput = document.getElementById('slug');

    if (!slugInput.dataset.editadoManualmente) {
      slugInput.value = slugify(this.value);
    }
  });

  document.getElementById('slug').addEventListener('input', function () {
    this.dataset.editadoManualmente = 'true';
  });

  document.getElementById('formProyecto').addEventListener('submit', function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const cargaBox = document.getElementById('cargaBox');
    const barra = document.getElementById('barraCarga');
    const texto = document.getElementById('cargaTexto');
    const boton = document.getElementById('btnGuardarProyecto');

    cargaBox.style.display = 'block';
    barra.style.width = '0%';
    texto.textContent = 'Preparando subida...';

    boton.disabled = true;
    boton.textContent = 'Procesando...';
    boton.style.opacity = '0.7';
    boton.style.cursor = 'not-allowed';

    const xhr = new XMLHttpRequest();
    let procesandoIntervalo = null;

    xhr.open('POST', form.action, true);

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const porcentaje = Math.round((event.loaded / event.total) * 100);

        barra.style.width = porcentaje + '%';
        texto.textContent = 'Subiendo archivo... ' + porcentaje + '%';

        if (porcentaje >= 100 && !procesandoIntervalo) {
          texto.textContent = '✅ Subida completada. Procesando ZIP...';

          let paso = 0;
          const mensajes = [
            '📦 Extrayendo archivos...',
            '🧠 Detectando tipo de proyecto...',
            '⚙️ Preparando runtime...',
            '🚀 Guardando proyecto...',
            '✅ Finalizando...'
          ];

          procesandoIntervalo = setInterval(function () {
            texto.textContent = mensajes[paso] || '✅ Finalizando...';
            paso++;

            if (paso >= mensajes.length) {
              paso = mensajes.length - 1;
            }
          }, 1800);
        }
      } else {
        texto.textContent = 'Subiendo archivo...';
      }
    };

    xhr.onload = function () {
      if (procesandoIntervalo) clearInterval(procesandoIntervalo);

      if (xhr.status >= 200 && xhr.status < 400) {
        texto.textContent = '✅ Proyecto creado correctamente';
        barra.style.width = '100%';

        setTimeout(function () {
          window.location.href = '/dashboard';
        }, 800);

        return;
      }

      texto.textContent = 'Error al crear proyecto';
      boton.disabled = false;
      boton.textContent = 'Guardar proyecto';
      boton.style.opacity = '1';
      boton.style.cursor = 'pointer';

      alert('Error del servidor:\n\n' + xhr.responseText);
    };

    xhr.onerror = function () {
      if (procesandoIntervalo) clearInterval(procesandoIntervalo);

      texto.textContent = 'Error de conexión';
      boton.disabled = false;
      boton.textContent = 'Guardar proyecto';
      boton.style.opacity = '1';
      boton.style.cursor = 'pointer';

      alert('No se pudo subir el proyecto. Revisa conexión o Render.');
    };

    xhr.send(formData);
  });

  cambiarMetodoEntrada();