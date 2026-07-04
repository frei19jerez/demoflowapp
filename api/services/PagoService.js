/**
 * PagoService.js
 * Servicio central de pagos DemoFlow IA
 */

module.exports = {

  // =========================================
  // CREAR REFERENCIA
  // =========================================

  crearReferencia: function () {
    return (
      'DF-' +
      Date.now() +
      '-' +
      Math.floor(1000 + Math.random() * 9000)
    );
  },

  // =========================================
  // NORMALIZAR MÉTODO
  // =========================================

  normalizarMetodo: function (metodo = 'manual') {
    const limpio = String(metodo || 'manual')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');

    if (
      limpio === 'bogota' ||
      limpio === 'banco_bogota' ||
      limpio === 'banco_de_bogota' ||
      limpio === 'banco_de_bogotá'
    ) {
      return 'banco_bogota';
    }

    if (limpio === 'paypal') return 'paypal';
    if (limpio === 'nequi') return 'nequi';
    if (limpio === 'bbva') return 'bbva';

    return 'manual';
  },

  // =========================================
  // CREAR PAGO
  // =========================================

  crearPago: async function ({
    usuario,
    metodo = 'manual',
    plan = 'pro',
    valor
  }) {

    if (!usuario) {
      throw new Error('Usuario requerido para crear pago.');
    }

    const metodoFinal = this.normalizarMetodo(metodo);
    const datosPlan = PlanService.obtener(plan);

    const valorFinal =
      typeof valor !== 'undefined' && valor !== null
        ? Number(valor)
        : Number(datosPlan.valor || datosPlan.precio || 0);

    const referencia = this.crearReferencia();

    const pago = await Pago.create({
      usuario,
      metodo: metodoFinal,
      plan: datosPlan.codigo,
      valor: valorFinal,
      moneda: datosPlan.moneda || 'COP',
      creditos: datosPlan.creditos || 0,
      referencia,
      estado: 'pendiente'
    }).fetch();

    sails.log.info('💳 IA DemoFlow: Pago creado:', {
      id: pago.id,
      usuario,
      metodo: metodoFinal,
      plan: datosPlan.codigo,
      valor: valorFinal,
      referencia
    });

    return {
      ok: true,
      pago,
      referencia,
      plan: datosPlan,
      instrucciones: await this.obtenerInstrucciones(pago),
      url: this.obtenerUrlPago({ metodo: metodoFinal, pago }),
      mensaje: 'Pago creado correctamente.'
    };

  },

  // =========================================
  // URL SEGÚN MÉTODO
  // =========================================

  obtenerUrlPago: function ({ metodo, pago }) {
    const metodoFinal = this.normalizarMetodo(metodo);

    if (metodoFinal === 'paypal') {
      return `/pago/${pago.id}/paypal`;
    }

    if (metodoFinal === 'nequi') {
      return `/pago/${pago.id}/nequi`;
    }

    if (metodoFinal === 'bbva') {
      return `/pago/${pago.id}/bbva`;
    }

    if (metodoFinal === 'banco_bogota') {
      return `/pago/${pago.id}/banco-bogota`;
    }

    return `/pago/${pago.id}`;
  },

  // =========================================
  // OBTENER PAGO
  // =========================================

  obtenerPago: async function (idPago) {
    const pago = await Pago.findOne({ id: idPago });

    if (!pago) {
      throw new Error('Pago no encontrado.');
    }

    return pago;
  },

  // =========================================
  // OBTENER INSTRUCCIONES
  // =========================================

  obtenerInstrucciones: async function (pago) {
    const metodoFinal = this.normalizarMetodo(pago.metodo);

    if (metodoFinal === 'paypal') {
      return await PaypalService.crearOrden(pago);
    }

    if (metodoFinal === 'nequi') {
      return await NequiService.datosPago(pago);
    }

    if (metodoFinal === 'bbva') {
      return await BBVAService.datosPago(pago);
    }

    if (metodoFinal === 'banco_bogota') {
      return await BancoBogotaService.datosPago(pago);
    }

    return {
      ok: true,
      metodo: metodoFinal,
      referencia: pago.referencia,
      valor: pago.valor,
      moneda: pago.moneda || 'COP',
      mensaje: 'Pago manual creado. Verifica y aprueba desde el panel.'
    };
  },

  // =========================================
  // APROBAR PAGO
  // =========================================

  aprobarPago: async function (idPago) {
    const pago = await this.obtenerPago(idPago);

    if (pago.estado === 'aprobado') {
      return {
        ok: true,
        pago,
        mensaje: 'El pago ya estaba aprobado.'
      };
    }

    const pagoActualizado = await Pago.updateOne({
      id: idPago
    }).set({
      estado: 'aprobado',
      fechaAprobacion: new Date()
    });

    await this.activarBeneficios(pagoActualizado);

    sails.log.info('✅ IA DemoFlow: Pago aprobado:', {
      id: pagoActualizado.id,
      usuario: pagoActualizado.usuario,
      plan: pagoActualizado.plan
    });

    return {
      ok: true,
      pago: pagoActualizado,
      mensaje: 'Pago aprobado y beneficios activados.'
    };
  },

  // =========================================
  // RECHAZAR PAGO
  // =========================================

  rechazarPago: async function (idPago) {
    const pago = await this.obtenerPago(idPago);

    if (pago.estado === 'rechazado') {
      return {
        ok: true,
        pago,
        mensaje: 'El pago ya estaba rechazado.'
      };
    }

    const pagoActualizado = await Pago.updateOne({
      id: idPago
    }).set({
      estado: 'rechazado'
    });

    sails.log.info('❌ IA DemoFlow: Pago rechazado:', {
      id: pagoActualizado.id,
      usuario: pagoActualizado.usuario
    });

    return {
      ok: true,
      pago: pagoActualizado,
      mensaje: 'Pago rechazado correctamente.'
    };
  },

  // =========================================
  // ACTIVAR BENEFICIOS
  // =========================================

  activarBeneficios: async function (pago) {
    const datosPlan = PlanService.obtener(pago.plan);

    const usuario = await Usuario.findOne({
      id: pago.usuario
    });

    if (!usuario) {
      throw new Error('Usuario del pago no encontrado.');
    }

    const creditosActuales = Number(usuario.creditos || 0);
    const creditosPago = Number(
      pago.creditos || datosPlan.creditos || 0
    );

    const nuevosCreditos = creditosActuales + creditosPago;

    await Usuario.updateOne({
      id: usuario.id
    }).set({
      creditos: nuevosCreditos,
      acceso_ia: true,
      plan: datosPlan.codigo
    });

    if (typeof SuscripcionService !== 'undefined') {
      await SuscripcionService.activar({
        usuario: usuario.id,
        plan: datosPlan.codigo,
        pago: pago.id
      });
    }

    return {
      ok: true,
      usuario: usuario.id,
      creditos: nuevosCreditos,
      plan: datosPlan.codigo
    };
  },

  // =========================================
  // LISTAR PAGOS DE USUARIO
  // =========================================

  listarPorUsuario: async function (usuario) {
    if (!usuario) {
      throw new Error('Usuario requerido.');
    }

    return await Pago.find({
      usuario
    }).sort('createdAt DESC');
  },

  // =========================================
  // DETECTAR MÉTODO IA
  // =========================================

  detectarMetodoIA: async function (texto = '') {
    const contenido = String(texto || '').toLowerCase();

    if (contenido.includes('nequi')) {
      return {
        metodo: 'nequi',
        mensaje: 'IA DemoFlow detectó pago Nequi.'
      };
    }

    if (contenido.includes('paypal')) {
      return {
        metodo: 'paypal',
        mensaje: 'IA DemoFlow detectó pago PayPal.'
      };
    }

    if (contenido.includes('bbva')) {
      return {
        metodo: 'bbva',
        mensaje: 'IA DemoFlow detectó pago BBVA.'
      };
    }

    if (
      contenido.includes('bogota') ||
      contenido.includes('bogotá') ||
      contenido.includes('banco de bogota') ||
      contenido.includes('banco de bogotá')
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
  // RECOMENDAR PLAN IA
  // =========================================

  recomendarPlanIA: async function (cantidadProyectos = 0) {
    return await PlanService.recomendarPlanIA({
      proyectos: cantidadProyectos
    });
  }

};