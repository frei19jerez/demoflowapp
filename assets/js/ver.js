const btnIA = document.getElementById('btnAnalizarIA');
const resultadoIA = document.getElementById('resultadoIA');
const contenidoIA = document.getElementById('contenidoResultadoIA');
const logsIA = document.getElementById('iaLogs');
const barraIA = document.getElementById('iaBarra');
const textoEstado = document.getElementById('iaTextoEstado');

if (btnIA) {

  btnIA.addEventListener('click', async function () {

    btnIA.disabled = true;

    btnIA.innerHTML =
      '🤖 Analizando proyecto...';

    resultadoIA.style.display = 'block';

    contenidoIA.innerHTML = '';

    logsIA.innerHTML =
      '🤖 DemoFlow IA iniciando análisis...';

    let progreso = 0;

    barraIA.style.width = '0%';

    const mensajes = [

      '🧠 Detectando estructura...',
      '⚡ Verificando runtime...',
      '📦 Analizando dependencias...',
      '🌐 Escaneando puertos...',
      '🚀 Evaluando potencial SaaS...',
      '🤖 Generando resultado IA...'

    ];

    let paso = 0;

    const intervalo = setInterval(() => {

      progreso += 15;

      if (progreso > 100) {
        progreso = 100;
      }

      barraIA.style.width =
        progreso + '%';

      if (mensajes[paso]) {

        textoEstado.innerText =
          mensajes[paso];

        logsIA.innerHTML += `
          <div>${mensajes[paso]}</div>
        `;

        logsIA.scrollTop =
          logsIA.scrollHeight;

        paso++;
      }

    }, 1200);

    try {

      const proyectoId =
        btnIA.dataset.id;

      const respuesta = await fetch(

        '/proyecto/' + proyectoId + '/analizar-ia',

        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          }
        }

      );

      if (!respuesta.ok) {
        throw new Error(
          'Error HTTP ' + respuesta.status
        );
      }

      const data =
        await respuesta.json();

      clearInterval(intervalo);

      barraIA.style.width = '100%';

      textoEstado.innerText =
        '✅ Análisis completado';

      const ia =
        data.resultadoIA || {};

      contenidoIA.innerHTML = `

        <div class="alert alert-success">

          <h3>
            🤖 Resultado DemoFlow IA
          </h3>

          <hr>

          <p>
            <strong>🧠 Tecnología detectada:</strong>
            ${ia.tecnologia || '-'}
          </p>

          <p>
            <strong>🚀 Listo para deploy:</strong>
            ${
              ia.listoParaDeploy
                ? '✅ Sí'
                : '❌ No'
            }
          </p>

          <hr>

          <h4>
            ✅ Recomendaciones IA
          </h4>

          <ul>

            ${
              ia.recomendaciones &&
              ia.recomendaciones.length

                ? ia.recomendaciones
                    .map(r => `
                      <li>${r}</li>
                    `)
                    .join('')

                : `
                    <li>
                      Proyecto analizado correctamente.
                    </li>
                  `
            }

          </ul>

          <hr>

          <h4>
            ❌ Errores detectados
          </h4>

          <ul>

            ${
              ia.errores &&
              ia.errores.length

                ? ia.errores
                    .map(e => `
                      <li>${e}</li>
                    `)
                    .join('')

                : `
                    <li>
                      No se detectaron errores críticos.
                    </li>
                  `
            }

          </ul>

          <hr>

          <p>
            💎 Créditos restantes:
            ${data.creditosRestantes || 0}
          </p>

        </div>

      `;

    } catch (error) {

      clearInterval(intervalo);

      barraIA.style.width = '100%';

      textoEstado.innerText =
        '❌ Error IA';

      contenidoIA.innerHTML = `

        <div class="alert alert-danger">

          ❌ DemoFlow IA no pudo
          completar el análisis.

        </div>

      `;

      console.error(error);

    }

    btnIA.disabled = false;

    btnIA.innerHTML =
      '🤖 Analizar proyecto con IA';

  });

}