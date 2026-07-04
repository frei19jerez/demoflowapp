/**
 * NequiService.js
 * Pagos Nequi DemoFlow IA
 */

module.exports = {

  datosPago: async function (pago) {
    return {
      ok: true,
      metodo: 'nequi',
      numero: process.env.NEQUI_NUMERO || 'CONFIGURAR_NEQUI',
      titular: process.env.NEQUI_TITULAR || 'Freimel Jerez',
      referencia: pago.referencia,
      valor: pago.valor,
      mensaje: 'Realiza el pago por Nequi y conserva el comprobante.'
    };
  }

};