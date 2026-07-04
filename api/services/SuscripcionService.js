/**
 * SuscripcionService.js
 * Servicio de suscripciones DemoFlow IA
 */

module.exports = {

  // =========================================
  // ACTIVAR SUSCRIPCIÓN
  // =========================================

  activar: async function ({
    usuario,
    plan,
    pago
  }) {

    const datosPlan = PlanService.obtener(plan);

    const fechaInicio = new Date();
    const fechaFin = new Date();

    fechaFin.setDate(
      fechaFin.getDate() +
      Number(datosPlan.dias || 30)
    );

    // Evitar suscripciones duplicadas
    const existente = await Suscripcion.findOne({
      usuario,
      estado: 'activa'
    });

    if (existente) {

      await Suscripcion.updateOne({
        id: existente.id
      }).set({
        plan: datosPlan.codigo,
        pago,
        fechaInicio,
        fechaFin
      });

    } else {

      await Suscripcion.create({

        usuario,
        plan: datosPlan.codigo,
        pago,
        estado: 'activa',
        fechaInicio,
        fechaFin

      });

    }

    await Usuario.updateOne({
      id: usuario
    }).set({

      plan: datosPlan.codigo,
      acceso_ia: true

    });

    return {
      ok: true,
      mensaje: 'Suscripción activada correctamente.'
    };

  },

  // =========================================
  // CANCELAR SUSCRIPCIÓN
  // =========================================

  cancelar: async function (usuario) {

    const suscripcion = await Suscripcion.findOne({
      usuario,
      estado: 'activa'
    });

    if (!suscripcion) {

      return {
        ok: false,
        mensaje: 'No existe una suscripción activa.'
      };

    }

    await Suscripcion.updateOne({
      id: suscripcion.id
    }).set({
      estado: 'cancelada'
    });

    await Usuario.updateOne({
      id: usuario
    }).set({
      plan: 'free'
    });

    return {
      ok: true,
      mensaje: 'Suscripción cancelada.'
    };

  },

  // =========================================
  // OBTENER SUSCRIPCIÓN
  // =========================================

  obtener: async function (usuario) {

    return await Suscripcion.findOne({
      usuario,
      estado: 'activa'
    });

  },

  // =========================================
  // VERIFICAR SI ESTÁ ACTIVA
  // =========================================

  activa: async function (usuario) {

    const suscripcion = await this.obtener(usuario);

    return !!suscripcion;

  },

  // =========================================
  // RENOVAR
  // =========================================

  renovar: async function (usuario) {

    const suscripcion = await this.obtener(usuario);

    if (!suscripcion) {

      return {
        ok: false
      };

    }

    const datosPlan = PlanService.obtener(
      suscripcion.plan
    );

    const fechaFin = new Date(
      suscripcion.fechaFin
    );

    fechaFin.setDate(
      fechaFin.getDate() +
      Number(datosPlan.dias || 30)
    );

    await Suscripcion.updateOne({
      id: suscripcion.id
    }).set({
      fechaFin
    });

    return {
      ok: true,
      mensaje: 'Suscripción renovada.'
    };

  }

};