/**
 * proyecto-ia.js
 *
 * Controla el análisis de proyectos desde la vista
 * views/pages/proyecto/ver.ejs
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  const boton =
    document.getElementById('btnAnalizarIA');

  const resultadoBox =
    document.getElementById('resultadoIA');

  const textoEstado =
    document.getElementById('iaTextoEstado');

  const barra =
    document.getElementById('iaBarra');

  const logs =
    document.getElementById('iaLogs');

  const contenido =
    document.getElementById(
      'contenidoResultadoIA'
    );

  /*
   * Esta página puede existir sin el botón
   * cuando el usuario no ha iniciado sesión.
   */
  if (!boton) {
    return;
  }

  const textoOriginal =
    boton.innerHTML;

  let analizando = false;

  /**
   * Convierte cualquier valor en texto seguro.
   */
  function normalizar(valor) {
    return String(
      typeof valor === 'undefined' ||
      valor === null
        ? ''
        : valor
    ).trim();
  }

  /**
   * Escapa HTML para evitar que una respuesta
   * se interprete como código dentro de la página.
   */
  function escaparHtml(valor) {
    return normalizar(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Actualiza el texto principal del proceso.
   */
  function cambiarEstado(mensaje) {
    if (textoEstado) {
      textoEstado.textContent = mensaje;
    }
  }

  /**
   * Actualiza la barra de progreso.
   */
  function cambiarProgreso(porcentaje) {
    if (!barra) {
      return;
    }

    const valor = Math.max(
      0,
      Math.min(
        Number(porcentaje) || 0,
        100
      )
    );

    barra.style.width = `${valor}%`;
    barra.setAttribute(
      'aria-valuenow',
      String(valor)
    );
  }

  /**
   * Agrega una línea al registro visual.
   */
  function agregarLog(mensaje) {
    if (!logs) {
      return;
    }

    const hora =
      new Date().toLocaleTimeString(
        'es-CO',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      );

    const linea =
      `[${hora}] ${normalizar(mensaje)}`;

    const contenidoActual =
      normalizar(logs.textContent);

    logs.textContent =
      contenidoActual
        ? `${contenidoActual}\n${linea}`
        : linea;

    logs.scrollTop =
      logs.scrollHeight;
  }

  /**
   * Muestra la zona de resultados.
   */
  function mostrarResultadoBox() {
    if (!resultadoBox) {
      return;
    }

    resultadoBox.style.display = 'block';

    resultadoBox.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  /**
   * Bloquea el botón mientras se procesa.
   */
  function bloquearBoton() {
    boton.disabled = true;
    boton.setAttribute(
      'aria-busy',
      'true'
    );

    boton.innerHTML =
      '⏳ Analizando proyecto...';
  }

  /**
   * Devuelve el botón a su estado inicial.
   */
  function desbloquearBoton() {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    boton.innerHTML = textoOriginal;
  }

  /**
   * Prepara la interfaz antes de enviar
   * la solicitud al servidor.
   */
  function iniciarInterfaz() {
    mostrarResultadoBox();

    cambiarEstado(
      'DemoFlow IA preparando el análisis...'
    );

    cambiarProgreso(8);

    if (logs) {
      logs.textContent = '';
    }

    if (contenido) {
      contenido.innerHTML =
        '<p>⏳ Preparando información del proyecto...</p>';
    }

    agregarLog(
      '🤖 DemoFlow IA recibió la solicitud.'
    );
  }

  /**
   * Construye los datos enviados al controlador.
   */
  function construirDatos() {
    return {
      proyectoId:
        Number(boton.dataset.id),

      nombre:
        normalizar(
          boton.dataset.nombre
        ),

      tipoProyecto:
        normalizar(
          boton.dataset.tipo
        ),

      tecnologia:
        normalizar(
          boton.dataset.tecnologia
        ),

      urlRepositorio:
        normalizar(
          boton.dataset.repo
        ),

      urlDemo:
        normalizar(
          boton.dataset.demo
        ),

      archivoEntrada:
        normalizar(
          boton.dataset.archivo
        ),

      comandoInicio:
        normalizar(
          boton.dataset.comando
        )
    };
  }

  /**
   * Extrae un texto útil del análisis
   * avanzado devuelto por el servidor.
   */
  function obtenerTextoAnalisis(data) {
    if (!data) {
      return '';
    }

    const candidatos = [
      data.respuesta,
      data.mensaje,

      data.ia &&
        data.ia.respuesta,

      data.ia &&
        data.ia.texto,

      data.analisis &&
        data.analisis.respuesta,

      data.analisis &&
        data.analisis.texto,

      data.analisis &&
        data.analisis.resumen,

      data.analisis &&
        data.analisis.ia &&
        data.analisis.ia.respuesta,

      data.analisis &&
        data.analisis.ia &&
        data.analisis.ia.texto
    ];

    for (const candidato of candidatos) {
      const texto = normalizar(candidato);

      if (texto) {
        return texto;
      }
    }

    return '';
  }

  /**
   * Convierte una lista en HTML.
   */
  function crearLista(titulo, elementos) {
    if (
      !Array.isArray(elementos) ||
      elementos.length === 0
    ) {
      return '';
    }

    const items = elementos
      .map(function (elemento) {
        if (
          elemento &&
          typeof elemento === 'object'
        ) {
          return (
            '<li>' +
            escaparHtml(
              elemento.mensaje ||
              elemento.descripcion ||
              elemento.texto ||
              JSON.stringify(elemento)
            ) +
            '</li>'
          );
        }

        return (
          '<li>' +
          escaparHtml(elemento) +
          '</li>'
        );
      })
      .join('');

    return `
      <div class="ia-resultado-bloque">
        <h4>${escaparHtml(titulo)}</h4>
        <ul>${items}</ul>
      </div>
    `;
  }

  /**
   * Presenta el resultado avanzado.
   */
  function mostrarResultado(data) {
    const proyecto =
      data.proyecto || {};

    const analisis =
      data.analisis || {};

    const ia =
      data.ia ||
      analisis.ia ||
      {};

    const texto =
      obtenerTextoAnalisis(data);

    const tecnologia =
      normalizar(
        analisis.tecnologia ||
        analisis.tipoDetectado ||
        boton.dataset.tecnologia
      );

    const recomendaciones =
      analisis.recomendaciones ||
      ia.recomendaciones ||
      [];

    const errores =
      analisis.errores ||
      ia.errores ||
      [];

    const advertencias =
      analisis.advertencias ||
      ia.advertencias ||
      [];

    const listoParaDeploy =
      typeof analisis.listoParaDeploy ===
      'boolean'
        ? analisis.listoParaDeploy
        : null;

    let html = `
      <div class="ia-resultado-final">

        <h3>
          ✅ Análisis completado
        </h3>

        <p>
          <strong>Proyecto:</strong>
          ${escaparHtml(
            proyecto.nombre ||
            boton.dataset.nombre ||
            'Proyecto DemoFlow'
          )}
        </p>
    `;

    if (tecnologia) {
      html += `
        <p>
          <strong>Tecnología detectada:</strong>
          ${escaparHtml(tecnologia)}
        </p>
      `;
    }

    if (listoParaDeploy !== null) {
      html += `
        <p>
          <strong>Estado para deploy:</strong>
          ${
            listoParaDeploy
              ? '✅ Listo para desplegar'
              : '⚠️ Requiere ajustes'
          }
        </p>
      `;
    }

    if (texto) {
      html += `
        <div class="ia-respuesta-texto">
          <h4>🤖 Respuesta de DemoFlow IA</h4>

          <p>
            ${escaparHtml(texto)
              .replace(/\n/g, '<br>')}
          </p>
        </div>
      `;
    }

    html += crearLista(
      '💡 Recomendaciones',
      recomendaciones
    );

    html += crearLista(
      '⚠️ Advertencias',
      advertencias
    );

    html += crearLista(
      '❌ Errores encontrados',
      errores
    );

    if (
      typeof data.saldo !== 'undefined' &&
      data.saldo !== null
    ) {
      html += `
        <p class="ia-saldo">
          💎 Diamantes disponibles:
          <strong>
            ${escaparHtml(data.saldo)}
          </strong>
        </p>
      `;
    }

    html += '</div>';

    if (contenido) {
      contenido.innerHTML = html;
    }
  }

  /**
   * Presenta un error de forma clara.
   */
  function mostrarError(error) {
    const mensaje =
      error && error.message
        ? error.message
        : 'DemoFlow IA no pudo completar el análisis.';

    cambiarEstado(
      'No fue posible completar el análisis.'
    );

    cambiarProgreso(100);

    agregarLog(
      `❌ ${mensaje}`
    );

    if (contenido) {
      contenido.innerHTML = `
        <div class="ia-error-box">
          <h3>❌ Error en el análisis</h3>

          <p>
            ${escaparHtml(mensaje)}
          </p>

          <p>
            Revisa los archivos del proyecto,
            el estado de DemoFlow IA y vuelve
            a intentarlo.
          </p>
        </div>
      `;
    }
  }

  /**
   * Ejecuta el análisis avanzado del proyecto.
   */
  async function analizarProyecto() {
    if (analizando) {
      return;
    }

    const datos =
      construirDatos();

    if (
      !Number.isSafeInteger(datos.proyectoId) ||
      datos.proyectoId <= 0
    ) {
      mostrarResultadoBox();

      mostrarError(
        new Error(
          'No se encontró el identificador del proyecto.'
        )
      );

      return;
    }

    analizando = true;

    bloquearBoton();
    iniciarInterfaz();

    try {
      cambiarProgreso(20);

      agregarLog(
        '📦 Leyendo información del proyecto.'
      );

      cambiarEstado(
        'Verificando tecnología y archivos...'
      );

      await new Promise(function (resolve) {
        setTimeout(resolve, 500);
      });

      cambiarProgreso(35);

      agregarLog(
        `🧠 Tecnología registrada: ${
          datos.tecnologia ||
          datos.tipoProyecto ||
          'No identificada'
        }.`
      );

      cambiarEstado(
        'Conectando con DemoFlow IA...'
      );

      /*
       * Ruta del análisis avanzado:
       * POST /proyecto/:id/analizar-ia
       */
      const respuesta = await fetch(
        `/proyecto/${datos.proyectoId}/analizar-ia`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json'
          },

          credentials: 'same-origin',

          body: JSON.stringify(datos)
        }
      );

      cambiarProgreso(70);

      agregarLog(
        '🌐 Respuesta recibida del servidor.'
      );

      let data;

      try {
        data = await respuesta.json();
      } catch (errorJson) {
        throw new Error(
          'El servidor devolvió una respuesta que no es JSON.'
        );
      }

      if (
        !respuesta.ok ||
        !data ||
        data.ok !== true
      ) {
        const error = new Error(
          data && data.mensaje
            ? data.mensaje
            : `La solicitud falló con estado ${respuesta.status}.`
        );

        error.status =
          respuesta.status;

        error.codigo =
          data && data.codigo
            ? data.codigo
            : null;

        throw error;
      }

      cambiarProgreso(92);

      agregarLog(
        '🧩 Organizando resultados del análisis.'
      );

      mostrarResultado(data);

      cambiarEstado(
        'Proyecto analizado correctamente.'
      );

      cambiarProgreso(100);

      agregarLog(
        '✅ Análisis terminado correctamente.'
      );

    } catch (error) {
      console.error(
        '❌ DemoFlow IA Analyzer:',
        error
      );

      mostrarError(error);

    } finally {
      analizando = false;
      desbloquearBoton();
    }
  }

  boton.addEventListener(
    'click',
    analizarProyecto
  );

  console.log(
    '🤖 DemoFlow IA Analyzer listo.'
  );

});