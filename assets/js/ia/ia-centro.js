'use strict';

document.addEventListener(
  'DOMContentLoaded',
  function () {
    const selectores =
      document.querySelectorAll(
        '.herramienta-selector'
      );

    const panel =
      document.getElementById(
        'panelTrabajoIA'
      );

    const titulo =
      document.getElementById(
        'tituloHerramientaIA'
      );

    const costo =
      document.getElementById(
        'costoHerramientaIA'
      );

    const herramientaInput =
      document.getElementById(
        'herramientaSeleccionada'
      );

    const grupoProyecto =
      document.getElementById(
        'grupoProyectoIA'
      );

    const grupoEntrada =
      document.getElementById(
        'grupoEntradaIA'
      );

    const proyecto =
      document.getElementById(
        'proyectoCentroIA'
      );

    const entrada =
      document.getElementById(
        'entradaCentroIA'
      );

    const ejecutar =
      document.getElementById(
        'btnEjecutarCentroIA'
      );

    const limpiar =
      document.getElementById(
        'btnLimpiarCentroIA'
      );

    const alerta =
      document.getElementById(
        'alertaCentroIA'
      );

    const resultado =
      document.getElementById(
        'resultadoCentroIA'
      );

    const contenido =
      document.getElementById(
        'contenidoCentroIA'
      );

    const saldoSuperior =
      document.getElementById(
        'diamantesCentroIA'
      );

    const saldoResultado =
      document.getElementById(
        'saldoResultadoCentroIA'
      );

    const referencia =
      document.getElementById(
        'referenciaCentroIA'
      );

    /*
     * Evita errores si la vista no contiene
     * todos los elementos requeridos.
     */
    if (
      !panel ||
      !titulo ||
      !costo ||
      !herramientaInput ||
      !grupoProyecto ||
      !grupoEntrada ||
      !proyecto ||
      !entrada ||
      !ejecutar ||
      !limpiar ||
      !alerta ||
      !resultado ||
      !contenido ||
      !saldoSuperior ||
      !saldoResultado ||
      !referencia
    ) {
      console.error(
        'DemoFlow IA: No se encontraron todos los elementos requeridos en la vista.'
      );

      return;
    }

    let requiereProyecto =
      false;

    let solicitudEnProceso =
      false;

    function mostrarAlerta(
      mensaje,
      tipo
    ) {
      const tipoFinal =
        tipo || 'info';

      alerta.className =
        'alert alert-' + tipoFinal;

      alerta.textContent =
        mensaje || '';

      alerta.classList.remove(
        'd-none'
      );
    }

    function ocultarAlerta() {
      alerta.classList.add(
        'd-none'
      );

      alerta.textContent = '';
    }

    function obtenerSaldoActual() {
      const saldo =
        Number(
          saldoSuperior.textContent
        );

      return Number.isFinite(saldo)
        ? Math.max(0, saldo)
        : 0;
    }

    function actualizarSaldo(
      saldo
    ) {
      const saldoNumero =
        Number(saldo);

      const saldoFinal =
        Number.isFinite(saldoNumero)
          ? Math.max(0, saldoNumero)
          : obtenerSaldoActual();

      saldoSuperior.textContent =
        String(saldoFinal);

      saldoResultado.textContent =
        String(saldoFinal);

      return saldoFinal;
    }

    function obtenerReferencia(
      datos
    ) {
      if (
        datos &&
        datos.referencia
      ) {
        return String(
          datos.referencia
        );
      }

      if (
        datos &&
        datos.ia &&
        datos.ia.referencia
      ) {
        return String(
          datos.ia.referencia
        );
      }

      return '';
    }

    function obtenerNuevoSaldo(
      datos
    ) {
      if (
        datos &&
        typeof datos.saldo !==
          'undefined' &&
        datos.saldo !== null
      ) {
        return Number(
          datos.saldo
        );
      }

      if (
        datos &&
        datos.ia &&
        typeof datos.ia.saldo !==
          'undefined' &&
        datos.ia.saldo !== null
      ) {
        return Number(
          datos.ia.saldo
        );
      }

      return obtenerSaldoActual();
    }

    function obtenerTextoResultado(
      datos
    ) {
      if (!datos) {
        return (
          'Solicitud completada correctamente.'
        );
      }

      const texto =
        datos.respuesta ||
        datos.readme ||
        datos.descripcion ||
        (
          datos.ia &&
          (
            datos.ia.respuesta ||
            datos.ia.texto ||
            datos.ia.analisis ||
            datos.ia.contenido
          )
        );

      if (
        typeof texto === 'string' &&
        texto.trim()
      ) {
        return texto.trim();
      }

      /*
       * Algunos análisis regresan un objeto
       * completo en datos.analisis.
       */
      if (
        typeof datos.analisis ===
          'string' &&
        datos.analisis.trim()
      ) {
        return datos.analisis.trim();
      }

      if (
        datos.analisis &&
        typeof datos.analisis ===
          'object'
      ) {
        if (
          datos.analisis.ia &&
          typeof datos.analisis.ia
            .respuesta === 'string'
        ) {
          return datos.analisis.ia
            .respuesta;
        }

        return JSON.stringify(
          datos.analisis,
          null,
          2
        );
      }

      return (
        'Solicitud completada correctamente.'
      );
    }

    function escaparHTML(
      valor
    ) {
      return String(
        valor || ''
      )
        .replace(
          /&/g,
          '&amp;'
        )
        .replace(
          /</g,
          '&lt;'
        )
        .replace(
          />/g,
          '&gt;'
        )
        .replace(
          /"/g,
          '&quot;'
        )
        .replace(
          /'/g,
          '&#039;'
        );
    }

    function obtenerIconoSeccion(
      tituloSeccion
    ) {
      const texto =
        String(
          tituloSeccion || ''
        ).toLowerCase();

      if (
        texto.includes('resumen')
      ) {
        return '📋';
      }

      if (
        texto.includes('tecnolog')
      ) {
        return '🛠️';
      }

      if (
        texto.includes('fortaleza')
      ) {
        return '💪';
      }

      if (
        texto.includes('problema') ||
        texto.includes('error')
      ) {
        return '⚠️';
      }

      if (
        texto.includes('seguridad') ||
        texto.includes('riesgo')
      ) {
        return '🔒';
      }

      if (
        texto.includes('rendimiento')
      ) {
        return '⚡';
      }

      if (
        texto.includes('seo') ||
        texto.includes('accesibilidad')
      ) {
        return '🌐';
      }

      if (
        texto.includes('comercial') ||
        texto.includes('venta') ||
        texto.includes('monetización')
      ) {
        return '💰';
      }

      if (
        texto.includes('arquitectura')
      ) {
        return '🧱';
      }

      if (
        texto.includes('recomendacion') ||
        texto.includes('mejora') ||
        texto.includes('siguiente')
      ) {
        return '🚀';
      }

      return '🤖';
    }

    function convertirContenidoSeccion(
      texto
    ) {
      const lineas =
        String(
          texto || ''
        )
          .split('\n')
          .map(
            function (linea) {
              return linea.trim();
            }
          )
          .filter(Boolean);

      let html = '';
      let listaAbierta = false;

      lineas.forEach(
        function (linea) {
          const esElementoLista =
            /^[-•*]\s+/.test(
              linea
            );

          if (esElementoLista) {
            if (!listaAbierta) {
              html += '<ul>';
              listaAbierta = true;
            }

            const textoLista =
              linea.replace(
                /^[-•*]\s+/,
                ''
              );

            html +=
              '<li>' +
              escaparHTML(textoLista) +
              '</li>';

            return;
          }

          if (listaAbierta) {
            html += '</ul>';
            listaAbierta = false;
          }

          html +=
            '<div class="resultado-ia-linea">' +
            escaparHTML(linea) +
            '</div>';
        }
      );

      if (listaAbierta) {
        html += '</ul>';
      }

      return html;
    }

    function formatearResultadoIA(
      texto
    ) {
      const contenidoOriginal =
        String(
          texto || ''
        ).trim();

      if (!contenidoOriginal) {
        return (
          '<div class="centro-vacio">' +
          'DemoFlow IA no devolvió contenido.' +
          '</div>'
        );
      }

      const lineas =
        contenidoOriginal.split(
          '\n'
        );

      const secciones = [];

      let seccionActual = {
        titulo: 'Resultado',
        contenido: []
      };

      lineas.forEach(
        function (linea) {
          const coincidencia =
            linea.trim().match(
              /^(\d+)[.)]\s+(.+)$/
            );

          if (coincidencia) {
            if (
              seccionActual
                .contenido.length > 0 ||
              seccionActual.titulo !==
                'Resultado'
            ) {
              secciones.push(
                seccionActual
              );
            }

            seccionActual = {
              titulo:
                coincidencia[2]
                  .trim(),
              contenido: []
            };

            return;
          }

          seccionActual
            .contenido
            .push(linea);
        }
      );

      if (
        seccionActual
          .contenido.length > 0 ||
        seccionActual.titulo !==
          'Resultado'
      ) {
        secciones.push(
          seccionActual
        );
      }

      return secciones
        .map(
          function (seccion) {
            const tituloFinal =
              seccion.titulo ||
              'Resultado';

            const icono =
              obtenerIconoSeccion(
                tituloFinal
              );

            const contenidoFinal =
              convertirContenidoSeccion(
                seccion.contenido
                  .join('\n')
              );

            return (
              '<article class="resultado-ia-seccion">' +
                '<h3 class="resultado-ia-titulo">' +
                  '<span>' +
                    icono +
                  '</span>' +
                  '<span>' +
                    escaparHTML(
                      tituloFinal
                    ) +
                  '</span>' +
                '</h3>' +
                '<div class="resultado-ia-contenido">' +
                  contenidoFinal +
                '</div>' +
              '</article>'
            );
          }
        )
        .join('');
    }

    function seleccionarHerramienta(
      boton
    ) {
      if (
        !boton ||
        boton.disabled
      ) {
        return;
      }

      selectores.forEach(
        function (elemento) {
          elemento.classList.remove(
            'boton-herramienta-activo'
          );
        }
      );

      boton.classList.add(
        'boton-herramienta-activo'
      );

      const herramienta =
        boton.dataset
          .herramienta || '';

      const tituloTexto =
        boton.dataset.titulo ||
        'DemoFlow IA';

      const costoTexto =
        boton.dataset.costo ||
        '0';

      requiereProyecto =
        boton.dataset
          .requiereProyecto ===
        'true';

      herramientaInput.value =
        herramienta;

      titulo.textContent =
        tituloTexto;

      costo.textContent =
        '💎 ' + costoTexto;

      entrada.placeholder =
        boton.dataset.placeholder ||
        'Escribe aquí...';

      if (requiereProyecto) {
        grupoProyecto
          .classList
          .remove('d-none');
      } else {
        grupoProyecto
          .classList
          .add('d-none');
      }

      const herramientasSinEntrada = [
        'analizar',
        'readme',
        'potencial',
        'dashboard'
      ];

      if (
        herramientasSinEntrada
          .includes(herramienta)
      ) {
        grupoEntrada
          .classList
          .add('d-none');
      } else {
        grupoEntrada
          .classList
          .remove('d-none');
      }

      panel.classList.remove(
        'd-none'
      );

      resultado.classList.add(
        'd-none'
      );

      referencia.textContent = '';

      ocultarAlerta();

      panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    function construirSolicitud(
      herramienta,
      proyectoId,
      texto
    ) {
      let url = '';
      let body = {};

      switch (herramienta) {
        case 'chat':
          url = '/ia/chat';

          body = {
            mensaje: texto,
            proyectoId:
              proyectoId || null
          };

          break;

        case 'analizar':
          url =
            '/ia/proyecto/' +
            proyectoId +
            '/analizar';

          body = {};

          break;

        case 'error':
          url =
            '/ia/explicar-error';

          body = {
            error: texto,
            proyectoId:
              proyectoId || null
          };

          break;

        case 'readme':
          url =
            '/ia/proyecto/' +
            proyectoId +
            '/readme';

          body = {};

          break;

        case 'seguridad':
          url =
            '/ia/revisar-seguridad';

          body = {
            contenido: texto,
            proyectoId:
              proyectoId || null
          };

          break;

        case 'seo':
          url =
            '/ia/analizar-seo';

          body = {
            contenido: texto,
            proyectoId:
              proyectoId || null
          };

          break;

        case 'potencial':
          url =
            '/ia/proyecto/' +
            proyectoId +
            '/potencial-comercial';

          body = {};

          break;

        case 'arquitectura':
          url =
            '/ia/analizar-arquitectura';

          body = {
            contenido: texto,
            proyectoId:
              proyectoId || null
          };

          break;

        case 'dashboard':
          url =
            '/ia/dashboard/analizar';

          body = {};

          break;

        default:
          return null;
      }

      return {
        url: url,
        body: body
      };
    }

    function procesarRespuestaJSON(
      respuesta
    ) {
      return respuesta
        .json()
        .then(
          function (datos) {
            return {
              respuesta: respuesta,
              datos: datos
            };
          }
        )
        .catch(
          function () {
            throw new Error(
              'DemoFlow IA devolvió una respuesta inválida.'
            );
          }
        );
    }

    function mostrarResultado(
      datos
    ) {
      const textoResultado =
        obtenerTextoResultado(
          datos
        );

      contenido.innerHTML =
        formatearResultadoIA(
          textoResultado
        );

      const nuevoSaldo =
        actualizarSaldo(
          obtenerNuevoSaldo(
            datos
          )
        );

      const referenciaFinal =
        obtenerReferencia(
          datos
        );

      referencia.textContent =
        referenciaFinal
          ? (
              'Referencia: ' +
              referenciaFinal
            )
          : '';

      resultado.classList.remove(
        'd-none'
      );

      mostrarAlerta(
        'Solicitud completada. ' +
        'Saldo actual: 💎 ' +
        nuevoSaldo +
        '.',
        'success'
      );

      resultado.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    selectores.forEach(
      function (boton) {
        boton.addEventListener(
          'click',
          function () {
            seleccionarHerramienta(
              boton
            );
          }
        );
      }
    );

    limpiar.addEventListener(
      'click',
      function () {
        if (solicitudEnProceso) {
          return;
        }

        entrada.value = '';
        proyecto.value = '';
        contenido.innerHTML = '';
        referencia.textContent = '';

        resultado.classList.add(
          'd-none'
        );

        ocultarAlerta();
      }
    );

    ejecutar.addEventListener(
      'click',
      function () {
        if (solicitudEnProceso) {
          mostrarAlerta(
            'DemoFlow IA ya está procesando una solicitud.',
            'warning'
          );

          return;
        }

        ocultarAlerta();

        const herramienta =
          herramientaInput.value;

        const proyectoId =
          proyecto.value;

        const texto =
          entrada.value.trim();

        if (!herramienta) {
          mostrarAlerta(
            'Selecciona una herramienta.',
            'warning'
          );

          return;
        }

        if (
          requiereProyecto &&
          !proyectoId
        ) {
          mostrarAlerta(
            'Selecciona un proyecto.',
            'warning'
          );

          return;
        }

        const requiereTexto = [
          'chat',
          'error',
          'seguridad',
          'seo',
          'arquitectura'
        ].includes(
          herramienta
        );

        if (
          requiereTexto &&
          !texto
        ) {
          mostrarAlerta(
            'Escribe la información que deseas analizar.',
            'warning'
          );

          return;
        }

        const solicitud =
          construirSolicitud(
            herramienta,
            proyectoId,
            texto
          );

        if (!solicitud) {
          mostrarAlerta(
            'Herramienta no disponible.',
            'danger'
          );

          return;
        }

        const textoOriginal =
          ejecutar.innerHTML;

        solicitudEnProceso = true;
        ejecutar.disabled = true;

        ejecutar.innerHTML =
          '<span ' +
            'class="spinner-border ' +
            'spinner-border-sm ' +
            'centro-loader me-2" ' +
            'role="status" ' +
            'aria-hidden="true">' +
          '</span>' +
          'Procesando...';

        fetch(
          solicitud.url,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body:
              JSON.stringify(
                solicitud.body
              )
          }
        )
          .then(
            procesarRespuestaJSON
          )
          .then(
            function (
              resultadoPeticion
            ) {
              const respuesta =
                resultadoPeticion
                  .respuesta;

              const datos =
                resultadoPeticion
                  .datos;

              if (
                !respuesta.ok ||
                !datos ||
                datos.ok !== true
              ) {
                const error =
                  new Error(
                    (
                      datos &&
                      datos.mensaje
                    ) ||
                    'No fue posible completar la solicitud.'
                  );

                error.status =
                  respuesta.status;

                error.code =
                  datos &&
                  datos.codigo
                    ? datos.codigo
                    : null;

                throw error;
              }

              mostrarResultado(
                datos
              );
            }
          )
          .catch(
            function (error) {
              console.error(
                'DemoFlow IA:',
                error
              );

              mostrarAlerta(
                (
                  error &&
                  error.message
                ) ||
                'DemoFlow IA no pudo procesar la solicitud.',
                'danger'
              );
            }
          )
          .finally(
            function () {
              solicitudEnProceso =
                false;

              ejecutar.disabled =
                false;

              ejecutar.innerHTML =
                textoOriginal;
            }
          );
      }
    );
  }
);