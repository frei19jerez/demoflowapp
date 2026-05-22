/**
 * PagoService.js
 * IA de pagos DemoFlow
 */

module.exports = {

  // =========================================
  // CREAR PAGO
  // =========================================

  crearPago: async function ({
    usuario,
    metodo,
    plan,
    valor
  }) {

    const referencia =
      'DF-' +
      Date.now() +
      '-' +
      Math.floor(Math.random() * 9999);

    const pago = await Pago.create({

      usuario,
      metodo,
      plan,
      valor,
      referencia,
      estado: 'pendiente'

    }).fetch();

    return {
      ok: true,
      pago,
      mensaje: 'Pago creado correctamente.'
    };
  },

  // =========================================
  // APROBAR PAGO
  // =========================================

  aprobarPago: async function (idPago) {

    const pago = await Pago.updateOne({
      id: idPago
    }).set({
      estado: 'aprobado'
    });

    return pago;
  },

  // =========================================
  // RECHAZAR PAGO
  // =========================================

  rechazarPago: async function (idPago) {

    const pago = await Pago.updateOne({
      id: idPago
    }).set({
      estado: 'rechazado'
    });

    return pago;
  },

  // =========================================
  // IA DETECTAR MÉTODO
  // =========================================

  detectarMetodoIA: async function (texto = '') {

    texto = texto.toLowerCase();

    if (
      texto.includes('nequi')
    ) {

      return {
        metodo: 'nequi',
        mensaje: 'IA DemoFlow detectó pago Nequi.'
      };
    }

    if (
      texto.includes('paypal')
    ) {

      return {
        metodo: 'paypal',
        mensaje: 'IA DemoFlow detectó pago PayPal.'
      };
    }

    if (
      texto.includes('bogota') ||
      texto.includes('banco')
    ) {

      return {
        metodo: 'banco_bogota',
        mensaje: 'IA DemoFlow detectó Banco de Bogotá.'
      };
    }

    return {
      metodo: 'desconocido',
      mensaje: 'IA DemoFlow no pudo detectar el método.'
    };
  },

  // =========================================
  // IA RECOMENDAR PLAN
  // =========================================

  recomendarPlanIA: async function (cantidadProyectos = 0) {

    if (cantidadProyectos <= 2) {

      return {
        plan: 'free',
        mensaje: 'IA recomienda plan FREE.'
      };
    }

    if (
      cantidadProyectos >= 3 &&
      cantidadProyectos <= 10
    ) {

      return {
        plan: 'pro',
        mensaje: 'IA recomienda plan PRO.'
      };
    }

    return {
      plan: 'empresa',
      mensaje: 'IA recomienda plan EMPRESA.'
    };
  }

};