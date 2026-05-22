/**
 * PlanService.js
 * IA de planes y suscripciones DemoFlow
 */

module.exports = {

  // =========================================
  // PLANES
  // =========================================

  obtenerPlanes: async function () {

    return [

      {
        nombre: 'FREE',
        codigo: 'free',
        precio: 0,
        proyectos: 3,
        almacenamiento: '500MB',
        soporte: false
      },

      {
        nombre: 'PRO',
        codigo: 'pro',
        precio: 30000,
        proyectos: 50,
        almacenamiento: '10GB',
        soporte: true
      },

      {
        nombre: 'EMPRESA',
        codigo: 'empresa',
        precio: 120000,
        proyectos: 9999,
        almacenamiento: 'Ilimitado',
        soporte: true
      }

    ];
  },

  // =========================================
  // IA RECOMENDAR PLAN
  // =========================================

  recomendarPlanIA: async function ({
    proyectos = 0,
    deploys = 0,
    almacenamiento = 0
  }) {

    // FREE
    if (
      proyectos <= 3 &&
      deploys <= 5
    ) {

      return {
        plan: 'free',
        mensaje:
          'IA DemoFlow recomienda FREE para empezar.'
      };
    }

    // PRO
    if (
      proyectos > 3 &&
      proyectos <= 50
    ) {

      return {
        plan: 'pro',
        mensaje:
          'IA DemoFlow recomienda PRO para programadores activos.'
      };
    }

    // EMPRESA
    return {
      plan: 'empresa',
      mensaje:
        'IA DemoFlow recomienda EMPRESA para alto tráfico.'
    };
  },

  // =========================================
  // VALIDAR LIMITES
  // =========================================

  validarLimites: async function ({
    plan = 'free',
    totalProyectos = 0
  }) {

    if (
      plan === 'free' &&
      totalProyectos >= 3
    ) {

      return {
        ok: false,
        mensaje:
          'Límite FREE alcanzado. Actualiza a PRO.'
      };
    }

    if (
      plan === 'pro' &&
      totalProyectos >= 50
    ) {

      return {
        ok: false,
        mensaje:
          'Límite PRO alcanzado. Actualiza a EMPRESA.'
      };
    }

    return {
      ok: true
    };
  },

  // =========================================
  // IA DETECTAR CRECIMIENTO
  // =========================================

  detectarCrecimientoIA: async function ({
    visitas = 0,
    proyectos = 0
  }) {

    if (
      visitas > 10000 ||
      proyectos > 100
    ) {

      return {
        creciendo: true,
        mensaje:
          'IA DemoFlow detectó crecimiento alto.'
      };
    }

    return {
      creciendo: false,
      mensaje:
        'Proyecto estable.'
    };
  }

};