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

        paso++;
      }

    }, 1200);

    try {

      const payload = {

        nombre:
          btnIA.dataset.nombre || '',

        tipoProyecto:
          btnIA.dataset.tipo || '',

        tecnologia:
          btnIA.dataset.tecnologia || '',

        urlRepositorio:
          btnIA.dataset.repo || '',

        urlDemo:
          btnIA.dataset.demo || '',

        archivoEntrada:
          btnIA.dataset.archivo || '',

        comandoInicio:
          btnIA.dataset.comando || ''

      };

      const respuesta = await fetch('/ia/analizar-proyecto', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)

      });

      const data = await respuesta.json();

      clearInterval(intervalo);

      barraIA.style.width = '100%';

      textoEstado.innerText =
        '✅ Análisis completado';

      contenidoIA.innerHTML = `

        <p>
          <strong>🧠 Tipo detectado:</strong>
          ${data.tipoDetectado || '-'}
        </p>

        <p>
          <strong>📄 Archivo recomendado:</strong>
          ${data.archivoRecomendado || '-'}
        </p>

        <p>
          <strong>⚙️ Comando recomendado:</strong>
          ${data.comandoRecomendado || '-'}
        </p>

        <p>
          <strong>🤖 Resultado IA:</strong>
          ${data.mensaje || 'Análisis completado.'}
        </p>

      `;

    } catch (error) {

      clearInterval(intervalo);

      contenidoIA.innerHTML =
        '❌ DemoFlow IA no pudo analizar el proyecto.';

      console.error(error);

    }

    btnIA.disabled = false;

    btnIA.innerHTML =
      '🤖 Analizar proyecto con IA';

  });

}