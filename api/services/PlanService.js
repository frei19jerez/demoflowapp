/**
 * PlanService.js
 * Servicio de planes y suscripciones DemoFlow IA
 */

module.exports = {

  // =========================================
  // PLANES BASE
  // =========================================

  planes: {

    free: {
      nombre: 'FREE',
      codigo: 'free',
      precio: 0,
      valor: 0,
      moneda: 'COP',
      creditos: 10,
      dias: 0,
      proyectos: 3,
      deploys: 5,
      almacenamiento: '500MB',
      soporte: false
    },

    pro: {
      nombre: 'PRO',
      codigo: 'pro',
      precio: 30000,
      valor: 30000,
      moneda: 'COP',
      creditos: 300,
      dias: 30,
      proyectos: 50,
      deploys: 200,
      almacenamiento: '10GB',
      soporte: true
    },

    empresa: {
      nombre: 'EMPRESA',
      codigo: 'empresa',
      precio: 120000,
      valor: 120000,
      moneda: 'COP',
      creditos: 1500,
      dias: 30,
      proyectos: 9999,
      deploys: 9999,
      almacenamiento: 'Ilimitado',
      soporte: true
    }

  },

  // =========================================
  // LISTAR PLANES
  // =========================================

  obtenerPlanes: async function () {
    return Object.values(this.planes);
  },

  listar: function () {
    return Object.values(this.planes);
  },

  // =========================================
  // OBTENER PLAN
  // =========================================

  obtener: function (codigo = 'pro') {
    const limpio = String(codigo || 'pro').toLowerCase();

    return this.planes[limpio] || this.planes.pro;
  },

  obtenerAsync: async function (codigo = 'pro') {
    return this.obtener(codigo);
  },

  // =========================================
  // CALCULAR VALOR
  // =========================================

  calcularValor: function (codigo = 'pro') {
    const plan = this.obtener(codigo);
    return Number(plan.valor || plan.precio || 0);
  },

  // =========================================
  // IA RECOMENDAR PLAN
  // =========================================

  recomendarPlanIA: async function ({
    proyectos = 0,
    deploys = 0,
    almacenamiento = 0,
    visitas = 0
  } = {}) {

    const totalProyectos = Number(proyectos || 0);
    const totalDeploys = Number(deploys || 0);
    const totalAlmacenamiento = Number(almacenamiento || 0);
    const totalVisitas = Number(visitas || 0);

    if (
      totalProyectos <= 3 &&
      totalDeploys <= 5 &&
      totalAlmacenamiento <= 500
    ) {
      return {
        plan: 'free',
        mensaje: 'IA DemoFlow recomienda FREE para empezar.',
        motivo: 'Pocos proyectos y bajo consumo.'
      };
    }

    if (
      totalProyectos <= 50 &&
      totalDeploys <= 200 &&
      totalVisitas <= 10000
    ) {
      return {
        plan: 'pro',
        mensaje: 'IA DemoFlow recomienda PRO para programadores activos.',
        motivo: 'Buen volumen de proyectos, deploys y uso comercial.'
      };
    }

    return {
      plan: 'empresa',
      mensaje: 'IA DemoFlow recomienda EMPRESA para alto tráfico.',
      motivo: 'Alto crecimiento, muchos proyectos o uso empresarial.'
    };
  },

  // =========================================
  // VALIDAR LÍMITES
  // =========================================

  validarLimites: async function ({
    plan = 'free',
    totalProyectos = 0,
    totalDeploys = 0
  } = {}) {

    const datosPlan = this.obtener(plan);

    if (Number(totalProyectos || 0) >= Number(datosPlan.proyectos || 0)) {
      return {
        ok: false,
        codigo: 'LIMITE_PROYECTOS',
        mensaje:
          plan === 'free'
            ? 'Límite FREE alcanzado. Actualiza a PRO.'
            : plan === 'pro'
              ? 'Límite PRO alcanzado. Actualiza a EMPRESA.'
              : 'Límite de proyectos alcanzado.'
      };
    }

    if (Number(totalDeploys || 0) >= Number(datosPlan.deploys || 0)) {
      return {
        ok: false,
        codigo: 'LIMITE_DEPLOYS',
        mensaje:
          plan === 'free'
            ? 'Límite de deploys FREE alcanzado. Actualiza a PRO.'
            : plan === 'pro'
              ? 'Límite de deploys PRO alcanzado. Actualiza a EMPRESA.'
              : 'Límite de deploys alcanzado.'
      };
    }

    return {
      ok: true,
      plan: datosPlan
    };
  },

  // =========================================
  // IA DETECTAR CRECIMIENTO
  // =========================================

  detectarCrecimientoIA: async function ({
    visitas = 0,
    proyectos = 0,
    deploys = 0
  } = {}) {

    if (
      Number(visitas || 0) > 10000 ||
      Number(proyectos || 0) > 100 ||
      Number(deploys || 0) > 300
    ) {
      return {
        creciendo: true,
        planRecomendado: 'empresa',
        mensaje: 'IA DemoFlow detectó crecimiento alto.'
      };
    }

    return {
      creciendo: false,
      planRecomendado: 'pro',
      mensaje: 'Proyecto estable.'
    };
  }

};