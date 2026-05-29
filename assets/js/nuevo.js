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
  const metodo = document.getElementById('metodoEntrada').value;

  const bloqueRuntime = document.getElementById('bloqueRuntime');
  const bloqueCarpetaDemo = document.getElementById('bloqueCarpetaDemo');
  const ayudaArchivo = document.getElementById('ayudaArchivo');
  const tecnologia = document.getElementById('tecnologia');
  const selectorCarpetaSails = document.getElementById('selectorCarpetaSails');

  bloqueRuntime.style.display = 'none';

  if (bloqueCarpetaDemo) {
    bloqueCarpetaDemo.style.display = 'none';
  }

  if (selectorCarpetaSails) {
    selectorCarpetaSails.style.display = 'none';
  }

  if (tipo === 'html') {
    if (bloqueCarpetaDemo) {
      bloqueCarpetaDemo.style.display = 'block';
    }

    if (ayudaArchivo) {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.html</strong> o un <strong>.zip</strong> con tu proyecto estático.';
    }

    tecnologia.value = 'HTML + CSS + JavaScript';
  }

  if (tipo === 'node') {
    bloqueRuntime.style.display = 'block';
    tecnologia.value = 'Node.js';

    if (ayudaArchivo && metodo === 'zip') {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Node.js.';
    }
  }

  if (tipo === 'sails') {
    bloqueRuntime.style.display = 'block';

    if (selectorCarpetaSails) {
      selectorCarpetaSails.style.display = 'block';
    }

    tecnologia.value = 'Sails.js + Node.js + PostgreSQL';

    if (ayudaArchivo && metodo === 'zip') {
      ayudaArchivo.innerHTML =
        'Sube un archivo <strong>.zip</strong> del proyecto Sails.js o selecciona una carpeta completa.';
    }
  }

  if (tipo === 'externo') {
    tecnologia.value = 'Demo externa';
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
  formProyecto.addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const cargaBox = document.getElementById('cargaBox');
    const barra = document.getElementById('barraCarga');
    const texto = document.getElementById('cargaTexto');
    const boton = document.getElementById('btnGuardarProyecto');
    const tipoProyectoInput = document.getElementById('tipoProyecto');
    const carpetaSails = document.getElementById('carpetaSails');
    const archivoDemoInput = document.getElementById('archivoDemo');

    if (cargaBox) {
      cargaBox.classList.remove('oculto');
      cargaBox.style.display = 'block';
    }

    if (barra) {
      barra.style.width = '0%';
    }

    if (texto) {
      texto.textContent = 'Preparando proyecto...';
    }

    if (boton) {
      boton.disabled = true;
      boton.textContent = 'Procesando...';
      boton.style.opacity = '0.7';
      boton.style.cursor = 'not-allowed';
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
          texto.textContent = '🤖 DemoFlow limpiando carpeta Sails...';
        }

        if (typeof window.crearZipSailsLimpio !== 'function') {
          throw new Error(
            'No se encontró crearZipSailsLimpio. Revisa sails-folder-builder.js'
          );
        }

        const zipLimpio = await window.crearZipSailsLimpio(
          carpetaSails.files
        );

        formData.delete('archivoDemo');

        formData.append(
          'archivoDemo',
          zipLimpio,
          zipLimpio.name
        );

        if (texto) {
          texto.textContent =
            '✅ ZIP limpio creado. Subiendo solo lo necesario...';
        }
      } else if (
        archivoDemoInput &&
        (!archivoDemoInput.files || archivoDemoInput.files.length === 0)
      ) {
        throw new Error(
          'Debes subir un ZIP, un HTML o seleccionar una carpeta Sails.'
        );
      }

      const xhr = new XMLHttpRequest();
      let procesandoIntervalo = null;

      xhr.open('POST', form.action, true);

      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const porcentaje = Math.round(
            (event.loaded / event.total) * 100
          );

          if (barra) {
            barra.style.width = porcentaje + '%';
          }

          if (texto) {
            texto.textContent =
              'Subiendo archivo optimizado... ' + porcentaje + '%';
          }

          if (porcentaje >= 100 && !procesandoIntervalo) {
            if (texto) {
              texto.textContent =
                '✅ Subida completada. Procesando proyecto...';
            }

            let paso = 0;

            const mensajes = [
              '📦 Extrayendo archivos...',
              '🧠 Detectando Sails.js...',
              '⚙️ Preparando runtime...',
              '🚀 Guardando proyecto...',
              '✅ Finalizando...'
            ];

            procesandoIntervalo = setInterval(function () {
              if (texto) {
                texto.textContent =
                  mensajes[paso] || '✅ Finalizando...';
              }

              paso++;

              if (paso >= mensajes.length) {
                paso = mensajes.length - 1;
              }
            }, 1800);
          }
        }
      };

      xhr.onload = function () {
        if (procesandoIntervalo) {
          clearInterval(procesandoIntervalo);
        }

        if (xhr.status >= 200 && xhr.status < 400) {
          if (texto) {
            texto.textContent = '✅ Proyecto creado correctamente';
          }

          if (barra) {
            barra.style.width = '100%';
          }

          setTimeout(function () {
            window.location.href = '/dashboard';
          }, 800);

          return;
        }

        if (texto) {
          texto.textContent = 'Error al crear proyecto';
        }

        if (boton) {
          boton.disabled = false;
          boton.textContent = 'Guardar proyecto';
          boton.style.opacity = '1';
          boton.style.cursor = 'pointer';
        }

        alert('Error del servidor:\n\n' + xhr.responseText);
      };

      xhr.onerror = function () {
        if (procesandoIntervalo) {
          clearInterval(procesandoIntervalo);
        }

        if (texto) {
          texto.textContent = 'Error de conexión';
        }

        if (boton) {
          boton.disabled = false;
          boton.textContent = 'Guardar proyecto';
          boton.style.opacity = '1';
          boton.style.cursor = 'pointer';
        }

        alert('No se pudo subir el proyecto. Revisa conexión o Render.');
      };

      xhr.send(formData);

    } catch (error) {
      if (texto) {
        texto.textContent = 'Error preparando proyecto';
      }

      if (boton) {
        boton.disabled = false;
        boton.textContent = 'Guardar proyecto';
        boton.style.opacity = '1';
        boton.style.cursor = 'pointer';
      }

      alert(error.message);
    }
  });
}

window.addEventListener('load', function () {
  cambiarMetodoEntrada();
  cambiarTipoProyecto();
});