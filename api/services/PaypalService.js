/**
 * PaypalService.js
 * Integración base PayPal DemoFlow IA
 */

module.exports = {

  crearOrden: async function (pago) {
    return {
      ok: true,
      metodo: 'paypal',
      pago,
      url: `/pago/${pago.id}`,
      mensaje: 'Orden PayPal preparada. Falta conectar API real.'
    };
  },

  verificar: async function () {
    return {
      ok: true,
      metodo: 'paypal',
      mensaje: 'Verificación PayPal pendiente de API real.'
    };
  }

};