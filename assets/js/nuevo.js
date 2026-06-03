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

  const tipoActual = tipoSelect.value;

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

    if (
      tipoActual === 'html' ||
      tipoActual === 'node' ||
      tipoActual === 'sails'
    ) {
      tipoSelect.value = tipoActual;
    } else {
      tipoSelect.value = 'html';
    }
  }

  if (metodo === 'git') {
    bloqueGit.style.display = 'block';

    tipoSelect.innerHTML = `
      <option value="node">Aplicación Node.js</option>
      <option value="sails">Aplicación Sails.js</option>
      <option value="html">Página HTML</option>
    `;

    if (
      tipoActual === 'node' ||
      tipoActual === 'sails' ||
      tipoActual === 'html'
    ) {
      tipoSelect.value = tipoActual;
    } else {
      tipoSelect.value = 'node';
    }
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

  if (bloqueRuntime) {
    bloqueRuntime.classList.add('oculto');
    bloqueRuntime.style.display = 'none';
  }

  if (bloqueCarpetaDemo) {
    bloqueCarpetaDemo.style.display = 'none';
  }

  if (selectorCarpetaSails) {
    selectorCarpetaSails.classList.add('oculto');
    selectorCarpetaSails.style.display = 'none';
  }

  // HTML

  if (tipo === 'html') {

    if (bloqueCarpetaDemo) {
      bloqueCarpetaDemo.style.display = 'block';
    }

    if (tecnologia) {
      tecnologia.value =
        'HTML + CSS + JavaScript';
    }

    if (ayudaArchivo) {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.html</strong> o un <strong>.zip</strong> con tu proyecto estático.';
    }

  }

  // NODE

  if (tipo === 'node') {

    if (bloqueRuntime) {
      bloqueRuntime.classList.remove('oculto');
      bloqueRuntime.style.display = 'block';
    }

    if (tecnologia) {
      tecnologia.value = 'Node.js';
    }

    if (ayudaArchivo) {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Node.js.';
    }

  }

  // SAILS

  if (tipo === 'sails') {

    if (bloqueRuntime) {
      bloqueRuntime.classList.remove('oculto');
      bloqueRuntime.style.display = 'block';
    }

    if (selectorCarpetaSails) {
      selectorCarpetaSails.classList.remove('oculto');
      selectorCarpetaSails.style.display = 'block';
    }

    if (tecnologia) {
      tecnologia.value =
        'Sails.js + Node.js + PostgreSQL';
    }

    if (ayudaArchivo) {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Sails.js o selecciona una carpeta completa.';
    }

  }

  // EXTERNO

  if (tipo === 'externo') {

    if (tecnologia) {
      tecnologia.value =
        'Demo externa';
    }

  }

}

function mostrarNombreArchivo() {
  const input = document.getElementById('archivoDemo');
  const box = document.getElementById('nombreArchivoSeleccionado');

  if (!input || !box) {
    return;
  }

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

    if (nombreInput && !nombreInput.value.trim()) {
      nombreInput.value = nombreBase;
    }

    if (slugInput && !slugInput.value.trim()) {
      slugInput.value = slugify(nombreBase);
    }

    const lower = archivo.name.toLowerCase();

    if (
      tipoSelect &&
      (
        lower.endsWith('.html') ||
        lower.endsWith('.htm')
      )
    ) {
      tipoSelect.value = 'html';
    }

    cambiarTipoProyecto();
  }
}

const metodoEntrada = document.getElementById('metodoEntrada');
const tipoProyecto = document.getElementById('tipoProyecto');
const archivoDemo = document.getElementById('archivoDemo');
const nombreInput = document.getElementById('nombre');
const slugInput = document.getElementById('slug');
const formProyecto = document.getElementById('formProyecto');

if (metodoEntrada) {
  metodoEntrada.addEventListener('change', cambiarMetodoEntrada);
}

if (tipoProyecto) {
  tipoProyecto.addEventListener('change', cambiarTipoProyecto);
}

if (archivoDemo) {
  archivoDemo.addEventListener('change', mostrarNombreArchivo);
}

if (nombreInput) {
  nombreInput.addEventListener('input', function () {
    if (
      slugInput &&
      !slugInput.dataset.editadoManualmente
    ) {
      slugInput.value = slugify(this.value);
    }
  });
}

if (slugInput) {
  slugInput.addEventListener('input', function () {
    this.dataset.editadoManualmente = 'true';
  });
}


if (formProyecto) {

  formProyecto.addEventListener('submit', function (e) {

    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const cargaBox = document.getElementById('cargaBox');
    const barra = document.getElementById('barraCarga');
    const texto = document.getElementById('cargaTexto');
    const iaEstado = document.getElementById('iaEstado');
    const boton = document.getElementById('btnGuardarProyecto');

    const tipoProyectoInput =
      document.getElementById('tipoProyecto');

    const carpetaSails =
      document.getElementById('carpetaSails');

    const archivoDemoInput =
      document.getElementById('archivoDemo');

    if (cargaBox) {
      cargaBox.classList.remove('oculto');
      cargaBox.style.display = 'block';

      cargaBox.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }

    if (barra) {
      barra.style.width = '0%';
    }

    if (texto) {
      texto.textContent =
        '🤖 IA DemoFlow preparando proyecto...';
    }

    if (iaEstado) {
      iaEstado.textContent =
        '🧠 IA analizando estructura del proyecto...';
    }

    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Procesando con IA...';
    }

    function iniciarSubida() {

      const xhr = new XMLHttpRequest();
      let procesandoIntervalo = null;

      xhr.open('POST', form.action, true);

      xhr.upload.onprogress = function (event) {

        if (!event.lengthComputable) {
          return;
        }

        const porcentaje = Math.round(
          (event.loaded / event.total) * 100
        );

        if (barra) {
          barra.style.width = porcentaje + '%';
        }

        if (texto) {
          texto.textContent =
            '⬆️ IA subiendo proyecto... ' +
            porcentaje +
            '%';
        }

        if (iaEstado) {
          iaEstado.textContent =
            '🚀 Enviando archivos a DemoFlow...';
        }

        if (
          porcentaje >= 100 &&
          !procesandoIntervalo
        ) {

          const mensajes = [
            '📦 IA extrayendo archivos...',
            '🧠 IA detectando tecnología...',
            '⚙️ IA preparando runtime...',
            '🚀 IA guardando proyecto...',
            '✅ IA finalizando...'
          ];

          let paso = 0;

          procesandoIntervalo =
            setInterval(function () {

              if (texto) {
                texto.textContent =
                  mensajes[paso];
              }

              paso++;

              if (paso >= mensajes.length) {
                paso = mensajes.length - 1;
              }

            }, 2000);
        }
      };

      xhr.onload = function () {

        if (procesandoIntervalo) {
          clearInterval(procesandoIntervalo);
        }

        if (
          xhr.status >= 200 &&
          xhr.status < 400
        ) {

          if (barra) {
            barra.style.width = '100%';
          }

          if (texto) {
            texto.textContent =
              '✅ Proyecto creado correctamente';
          }

          if (iaEstado) {
            iaEstado.textContent =
              '🎉 IA DemoFlow terminó el proceso.';
          }

          setTimeout(function () {
            window.location.href =
              '/dashboard';
          }, 1000);

          return;
        }

        if (boton) {
          boton.disabled = false;
          boton.textContent =
            'Guardar proyecto';
        }

        alert(
          'Error del servidor:\n\n' +
          xhr.responseText
        );
      };

      xhr.onerror = function () {

        if (procesandoIntervalo) {
          clearInterval(procesandoIntervalo);
        }

        if (boton) {
          boton.disabled = false;
          boton.textContent =
            'Guardar proyecto';
        }

        alert(
          'No se pudo subir el proyecto.'
        );
      };

      xhr.send(formData);
    }

    try {

      if (
        tipoProyectoInput &&
        tipoProyectoInput.value === 'sails' &&
        carpetaSails &&
        carpetaSails.files &&
        carpetaSails.files.length > 0
      ) {

        if (texto) {
          texto.textContent =
            '🤖 IA limpiando carpeta Sails...';
        }

        window
          .crearZipSailsLimpio(
            carpetaSails.files
          )
          .then(function (zipLimpio) {

            formData.delete(
              'archivoDemo'
            );

            formData.append(
              'archivoDemo',
              zipLimpio,
              zipLimpio.name
            );

            iniciarSubida();
          })
          .catch(function (error) {

            if (boton) {
              boton.disabled = false;
              boton.textContent =
                'Guardar proyecto';
            }

            alert(error.message);
          });

      } else {

        iniciarSubida();

      }

    } catch (error) {

      if (boton) {
        boton.disabled = false;
        boton.textContent =
          'Guardar proyecto';
      }

      alert(error.message);
    }

  });

}

window.addEventListener('load', function () {
  cambiarMetodoEntrada();
  cambiarTipoProyecto();
});