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

      let requiereProyecto =
        false;

      function mostrarAlerta(
        mensaje,
        tipo
      ) {
        alerta.className =
          `alert alert-${tipo}`;

        alerta.textContent =
          mensaje;

        alerta.classList.remove(
          'd-none'
        );
      }

      function ocultarAlerta() {
        alerta.classList.add(
          'd-none'
        );
      }

      function seleccionarHerramienta(
        boton
      ) {
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
          boton.dataset.herramienta;

        const tituloTexto =
          boton.dataset.titulo;

        const costoTexto =
          boton.dataset.costo;

        requiereProyecto =
          boton.dataset
            .requiereProyecto ===
          'true';

        herramientaInput.value =
          herramienta;

        titulo.textContent =
          tituloTexto;

        costo.textContent =
          `💎 ${costoTexto}`;

        entrada.placeholder =
          boton.dataset.placeholder ||
          'Escribe aquí...';

        if (requiereProyecto) {
          grupoProyecto.classList.remove(
            'd-none'
          );
        } else {
          grupoProyecto.classList.add(
            'd-none'
          );
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
          grupoEntrada.classList.add(
            'd-none'
          );
        } else {
          grupoEntrada.classList.remove(
            'd-none'
          );
        }

        panel.classList.remove(
          'd-none'
        );

        resultado.classList.add(
          'd-none'
        );

        ocultarAlerta();

        panel.scrollIntoView({
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
          entrada.value = '';
          proyecto.value = '';
          resultado.classList.add(
            'd-none'
          );
          ocultarAlerta();
        }
      );

      ejecutar.addEventListener(
        'click',
        async function () {
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
          ].includes(herramienta);

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
                `/ia/proyecto/${proyectoId}/analizar`;
              body = {};
              break;

            case 'error':
              url = '/ia/explicar-error';
              body = {
                error: texto,
                proyectoId:
                  proyectoId || null
              };
              break;

            case 'readme':
              url =
                `/ia/proyecto/${proyectoId}/readme`;
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
              url = '/ia/analizar-seo';
              body = {
                contenido: texto,
                proyectoId:
                  proyectoId || null
              };
              break;

            case 'potencial':
              url =
                `/ia/proyecto/${proyectoId}/potencial-comercial`;
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
              mostrarAlerta(
                'Herramienta no disponible.',
                'danger'
              );
              return;
          }

          const textoOriginal =
            ejecutar.innerHTML;

          ejecutar.disabled = true;

          ejecutar.innerHTML =
            '<span class="spinner-border spinner-border-sm centro-loader me-2"></span>Procesando...';

          try {
            const respuesta =
              await fetch(
                url,
                {
                  method: 'POST',

                  headers: {
                    'Content-Type':
                      'application/json',

                    Accept:
                      'application/json'
                  },

                  body:
                    JSON.stringify(body)
                }
              );

            let datos = {};

            try {
              datos =
                await respuesta.json();
            } catch (errorJson) {
              throw new Error(
                'DemoFlow IA devolvió una respuesta inválida.'
              );
            }

            if (
              !respuesta.ok ||
              datos.ok !== true
            ) {
              throw new Error(
                datos.mensaje ||
                'No fue posible completar la solicitud.'
              );
            }

            const textoResultado =
              datos.respuesta ||
              datos.analisis ||
              datos.readme ||
              datos.descripcion ||
              (
                datos.ia &&
                datos.ia.respuesta
              ) ||
              'Solicitud completada correctamente.';

            contenido.textContent =
              textoResultado;

            const nuevoSaldo =
              typeof datos.saldo !==
                'undefined'
                ? Number(
                    datos.saldo
                  )
                : (
                    datos.ia &&
                    typeof datos.ia.saldo !==
                      'undefined'
                      ? Number(
                          datos.ia.saldo
                        )
                      : Number(
                          saldoSuperior
                            .textContent
                        )
                  );

            saldoSuperior.textContent =
              nuevoSaldo;

            saldoResultado.textContent =
              nuevoSaldo;

            referencia.textContent =
              datos.referencia
                ? `Referencia: ${datos.referencia}`
                : (
                    datos.ia &&
                    datos.ia.referencia
                      ? `Referencia: ${datos.ia.referencia}`
                      : ''
                  );

            resultado.classList.remove(
              'd-none'
            );

            mostrarAlerta(
              `Solicitud completada. Saldo actual: 💎 ${nuevoSaldo}.`,
              'success'
            );

            resultado.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          } catch (error) {
            mostrarAlerta(
              error.message ||
              'DemoFlow IA no pudo procesar la solicitud.',
              'danger'
            );
          } finally {
            ejecutar.disabled = false;

            ejecutar.innerHTML =
              textoOriginal;
          }
        }
      );
    }
  );