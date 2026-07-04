/**
 * SuscripcionService.js
 * Manejo de suscripciones DemoFlow IA
 */

module.exports = {

  activar: async function ({ usuario, plan, pago }) {
    const datosPlan = PlanService.obtener(plan);

    const fechaInicio = new Date();
    const fechaFin = new Date();

    fechaFin.setDate(fechaFin.getDate() + Number(datosPlan.dias || 30));

    const suscripcion = await Suscripcion.create({
      usuario,
      plan: datosPlan.codigo,
      pago,
      estado: 'activa',
      fechaInicio,
      fechaFin
    }).fetch();

    await Usuario.updateOne({ id: usuario }).set({
      plan: datosPlan.codigo,
      acceso_ia: true
    });

    return {
      ok: true,
      suscripcion
    };
  }

};