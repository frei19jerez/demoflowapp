/**
 * BBVAService.js
 * Pagos BBVA DemoFlow IA
 */

module.exports = {

  datosPago: async function (pago) {
    return {
      ok: true,
      metodo: 'bbva',
      banco: 'BBVA',
      titular: process.env.BBVA_TITULAR || 'Freimel Jerez',
      cuenta: process.env.BBVA_CUENTA || 'CONFIGURAR_CUENTA',
      tipoCuenta: process.env.BBVA_TIPO_CUENTA || 'Ahorros',
      referencia: pago.referencia,
      valor: pago.valor
    };
  }

};