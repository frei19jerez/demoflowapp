/* =========================
   📊 CHARTS DEMOFLOW IA
========================= */

document.addEventListener('DOMContentLoaded', () => {

  if (typeof Chart === 'undefined') {
    return;
  }

  const dataBox =
    document.getElementById('iaChartData');

  if (!dataBox) {
    return;
  }

  const totalProyectos =
    parseInt(
      dataBox.dataset.totalProyectos
    ) || 0;

  const demosConUrl =
    parseInt(
      dataBox.dataset.demosUrl
    ) || 0;

  const proyectosSails =
    parseInt(
      dataBox.dataset.sails
    ) || 0;

  const proyectosHtml =
    parseInt(
      dataBox.dataset.html
    ) || 0;

  /* =========================
     🚀 DEMOS ACTIVAS
  ========================= */

  const chartDemos =
    document.getElementById(
      'chartDemos'
    );

  if (chartDemos) {

    new Chart(chartDemos, {

      type: 'doughnut',

      data: {

        labels: [
          'Demos activas',
          'Sin demo'
        ],

        datasets: [{

          data: [
            demosConUrl,
            Math.max(
              totalProyectos - demosConUrl,
              0
            )
          ],

          backgroundColor: [
            '#2563eb',
            '#d1d5db'
          ],

          borderWidth: 0

        }]

      },

      options: {

        responsive: true,

        plugins: {

          legend: {
            position: 'bottom'
          }

        }

      }

    });

  }

  /* =========================
     🧠 TECNOLOGÍAS
  ========================= */

  const chartTecnologias =
    document.getElementById(
      'chartTecnologias'
    );

  if (chartTecnologias) {

    new Chart(chartTecnologias, {

      type: 'bar',

      data: {

        labels: [
          'Sails.js',
          'HTML'
        ],

        datasets: [{

          label: 'Proyectos',

          data: [
            proyectosSails,
            proyectosHtml
          ],

          backgroundColor: [
            '#7c3aed',
            '#06b6d4'
          ],

          borderRadius: 12

        }]

      },

      options: {

        responsive: true,

        plugins: {

          legend: {
            display: false
          }

        },

        scales: {

          y: {

            beginAtZero: true,

            ticks: {
              precision: 0
            }

          }

        }

      }

    });

  }

  /* =========================
     👁️ VISTAS
  ========================= */

  const chartVistas =
    document.getElementById(
      'chartVistas'
    );

  if (chartVistas) {

    new Chart(chartVistas, {

      type: 'line',

      data: {

        labels: [
          'Lun',
          'Mar',
          'Mié',
          'Jue',
          'Vie',
          'Sáb',
          'Dom'
        ],

        datasets: [{

          label: 'Vistas',

          data: [
            5,
            12,
            18,
            25,
            33,
            41,
            58
          ],

          borderColor: '#2563eb',

          backgroundColor:
            'rgba(37,99,235,0.15)',

          fill: true,

          tension: 0.4

        }]

      },

      options: {

        responsive: true,

        plugins: {

          legend: {
            position: 'bottom'
          }

        }

      }

    });

  }

  /* =========================
     🔥 IA SCORE
  ========================= */

  const chartScore =
    document.getElementById(
      'chartScore'
    );

  if (chartScore) {

    new Chart(chartScore, {

      type: 'radar',

      data: {

        labels: [
          'Diseño',
          'Demo',
          'Venta',
          'Tecnología',
          'SaaS'
        ],

        datasets: [{

          label: 'IA Score',

          data: [
            85,
            70,
            92,
            88,
            96
          ],

          borderColor: '#7c3aed',

          backgroundColor:
            'rgba(124,58,237,0.15)',

          pointBackgroundColor:
            '#7c3aed'

        }]

      },

      options: {

        responsive: true,

        scales: {

          r: {

            beginAtZero: true,
            max: 100

          }

        },

        plugins: {

          legend: {
            position: 'bottom'
          }

        }

      }

    });

  }

});