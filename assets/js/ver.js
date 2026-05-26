console.log('✅ ver.js cargado correctamente');

const btnIA = document.getElementById('btnAnalizarIA');
const resultadoIA = document.getElementById('resultadoIA');
const contenidoIA = document.getElementById('contenidoResultadoIA');
const logsIA = document.getElementById('iaLogs');
const barraIA = document.getElementById('iaBarra');
const textoEstado = document.getElementById('iaTextoEstado');

if (btnIA) {
  btnIA.addEventListener('click', async function () {
    console.log('🤖 Click IA ejecutado');

    const proyectoId = btnIA.dataset.id;

    if (!proyectoId) {
      console.error('❌ Falta data-id en el botón IA');
      alert('Error: falta ID del proyecto.');
      return;
    }

    btnIA.disabled = true;
    btnIA.innerHTML = '🤖 DemoFlow IA analizando...';

    resultadoIA.style.display = 'block';
    contenidoIA.innerHTML = '⏳ Preparando análisis inteligente...';
    logsIA.innerHTML = '🤖 DemoFlow IA conectando con el motor inteligente...';
    barraIA.style.width = '0%';
    textoEstado.innerText = 'DemoFlow IA iniciando análisis...';

    let progreso = 0;
    let paso = 0;

    const mensajes = [
      '🧠 IA leyendo datos del proyecto...',
      '📦 Detectando tecnología y estructura...',
      '⚡ Verificando runtime y deploy...',
      '🌐 Revisando URL, puerto y demo...',
      '🚀 Evaluando potencial SaaS...',
      '💎 Generando recomendaciones IA...',
      '✅ Preparando resultado final...'
    ];

    const intervalo = setInterval(function () {
      progreso += 14;

      if (progreso > 95) {
        progreso = 95;
      }

      barraIA.style.width = progreso + '%';

      if (mensajes[paso]) {
        textoEstado.innerText = mensajes[paso];

        logsIA.innerHTML += `
          <div>${mensajes[paso]}</div>
        `;

        logsIA.scrollTop = logsIA.scrollHeight;
        paso++;
      }
    }, 900);

    try {
      const respuesta = await fetch('/proyecto/' + proyectoId + '/analizar-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const contentType = respuesta.headers.get('content-type') || '';

      if (!respuesta.ok) {
        throw new Error('Error HTTP ' + respuesta.status);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('El servidor no devolvió JSON. Revisa si todavía hay redirect en analizarIA.');
      }

      const data = await respuesta.json();

      clearInterval(intervalo);

      barraIA.style.width = '100%';
      textoEstado.innerText = '✅ DemoFlow IA completó el análisis';

      const ia = data.resultadoIA || {};

      const tecnologia = ia.tecnologia || btnIA.dataset.tecnologia || 'No detectada';
      const listoParaDeploy = ia.listoParaDeploy === true;

      const recomendaciones = Array.isArray(ia.recomendaciones)
        ? ia.recomendaciones
        : [];

      const errores = Array.isArray(ia.errores)
        ? ia.errores
        : [];

      logsIA.innerHTML += `
        <div>✅ Análisis completado correctamente.</div>
      `;

      contenidoIA.innerHTML = `
        <div class="ia-result-card">

          <h3>🤖 Resultado inteligente DemoFlow IA</h3>

          <div class="ia-result-grid">

            <div class="ia-result-item">
              <strong>🧠 Tecnología detectada</strong>
              <span>${tecnologia}</span>
            </div>

            <div class="ia-result-item">
              <strong>🚀 Estado deploy</strong>
              <span>
                ${
                  listoParaDeploy
                    ? '✅ Listo para deploy'
                    : '⚠️ Requiere revisión'
                }
              </span>
            </div>

            <div class="ia-result-item">
              <strong>📦 Tipo de proyecto</strong>
              <span>${btnIA.dataset.tipo || '-'}</span>
            </div>

            <div class="ia-result-item">
              <strong>💎 Créditos restantes</strong>
              <span>${data.creditosRestantes ?? '-'}</span>
            </div>

          </div>

          <div class="ia-section">
            <h4>✅ Recomendaciones IA</h4>
            <ul>
              ${
                recomendaciones.length
                  ? recomendaciones.map(r => `<li>${r}</li>`).join('')
                  : '<li>Proyecto registrado correctamente en DemoFlow.</li>'
              }
            </ul>
          </div>

          <div class="ia-section">
            <h4>❌ Errores detectados</h4>
            <ul>
              ${
                errores.length
                  ? errores.map(e => `<li>${e}</li>`).join('')
                  : '<li>No se detectaron errores críticos.</li>'
              }
            </ul>
          </div>

          <div class="ia-section">
            <h4>🧠 Diagnóstico IA</h4>
            <p>
              ${data.mensaje || 'DemoFlow IA analizó el proyecto correctamente.'}
            </p>
          </div>

        </div>
      `;

    } catch (error) {
      clearInterval(intervalo);

      barraIA.style.width = '100%';
      textoEstado.innerText = '❌ Error en DemoFlow IA';

      logsIA.innerHTML += `
        <div>❌ Error: ${error.message}</div>
      `;

      contenidoIA.innerHTML = `
        <div class="ia-error-box">
          <h3>❌ DemoFlow IA no pudo completar el análisis</h3>
          <p>${error.message}</p>
          <p>
            Revisa que <strong>ProyectoController.analizarIA</strong>
            esté devolviendo <strong>res.json()</strong> y no redirect.
          </p>
        </div>
      `;

      console.error(error);
    }

    btnIA.disabled = false;
    btnIA.innerHTML = '🤖 Analizar proyecto con IA';
  });
}