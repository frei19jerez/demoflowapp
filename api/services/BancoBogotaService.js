/**
 * BancoBogotaService.js
 * Pagos Banco de Bogotá DemoFlow IA
 */

module.exports = {

  datosPago: async function (pago) {
    return {
      ok: true,
      metodo: 'banco_bogota',
      banco: 'Banco de Bogotá',
      titular: process.env.BOGOTA_TITULAR || 'Freimel Jerez',
      cuenta: process.env.BOGOTA_CUENTA || 'CONFIGURAR_CUENTA',
      tipoCuenta: process.env.BOGOTA_TIPO_CUENTA || 'Ahorros',
      referencia: pago.referencia,
      valor: pago.valor
    };
  }

};