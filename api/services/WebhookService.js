/**
 * WebhookService.js
 *
 * Servicio central de webhooks para DemoFlowApp.
 *
 * Responsabilidades:
 * - Validar la firma de los eventos enviados por Wompi.
 * - Buscar el pago mediante la referencia.
 * - Verificar monto y moneda.
 * - Aprobar o rechazar el pago.
 * - Evitar activaciones duplicadas.
 */

const crypto = require('crypto');

module.exports = {

  // =========================================
  // OBTENER VALOR POR RUTA
  // =========================================

  obtenerValorPorRuta: function (objeto, ruta) {
    if (!objeto || !ruta) {
      return undefined;
    }

    return String(ruta)
      .split('.')
      .reduce(function (actual, propiedad) {
        if (
          actual === null ||
          typeof actual === 'undefined'
        ) {
          return undefined;
        }

        return actual[propiedad];
      }, objeto);
  },

  // =========================================
  // COMPARACIÓN SEGURA
  // =========================================

  compararFirmas: function (firmaA, firmaB) {
    const a = String(firmaA || '')
      .trim()
      .toLowerCase();

    const b = String(firmaB || '')
      .trim()
      .toLowerCase();

    if (!a || !b || a.length !== b.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(a, 'utf8'),
        Buffer.from(b, 'utf8')
      );
    } catch (error) {
      return false;
    }
  },

  // =========================================
  // CALCULAR FIRMA DEL EVENTO WOMPI
  // =========================================

  calcularFirmaWompi: function (evento) {
    if (!evento || typeof evento !== 'object') {
      throw new Error(
        'El cuerpo del evento de Wompi no es válido.'
      );
    }

    const signature = evento.signature || {};
    const properties = signature.properties;

    if (!Array.isArray(properties)) {
      throw new Error(
        'El evento no contiene signature.properties.'
      );
    }

    if (
      typeof evento.timestamp === 'undefined' ||
      evento.timestamp === null
    ) {
      throw new Error(
        'El evento no contiene timestamp.'
      );
    }

    const config =
      WompiService.validarConfiguracionWebhook();

    let cadena = '';

    for (const propiedad of properties) {
      const valor = this.obtenerValorPorRuta(
        evento.data,
        propiedad
      );

      if (
        typeof valor === 'undefined' ||
        valor === null
      ) {
        throw new Error(
          `No se encontró la propiedad firmada: ${propiedad}.`
        );
      }

      cadena += String(valor);
    }

    cadena += String(evento.timestamp);
    cadena += config.eventsSecret;

    return crypto
      .createHash('sha256')
      .update(cadena, 'utf8')
      .digest('hex');
  },

  // =========================================
  // VALIDAR FIRMA WOMPI
  // =========================================

  validarFirmaWompi: function (
    evento,
    checksumHeader = null
  ) {
    const firmaCalculada =
      this.calcularFirmaWompi(evento);

    const firmaCuerpo =
      evento &&
      evento.signature &&
      evento.signature.checksum
        ? evento.signature.checksum
        : '';

    const firmaRecibida =
      checksumHeader ||
      firmaCuerpo;

    const valida = this.compararFirmas(
      firmaCalculada,
      firmaRecibida
    );

    return {
      valida,
      firmaCalculada,
      firmaRecibida
    };
  },

  // =========================================
  // NORMALIZAR ESTADO WOMPI
  // =========================================

  normalizarEstadoWompi: function (estado) {
    const estadoFinal = String(estado || '')
      .trim()
      .toUpperCase();

    if (estadoFinal === 'APPROVED') {
      return 'aprobado';
    }

    if (
      estadoFinal === 'DECLINED' ||
      estadoFinal === 'VOIDED' ||
      estadoFinal === 'ERROR'
    ) {
      return 'rechazado';
    }

    return 'pendiente';
  },

  // =========================================
  // EXTRAER TRANSACCIÓN
  // =========================================

  extraerTransaccion: function (evento) {
    if (
      !evento ||
      !evento.data ||
      !evento.data.transaction
    ) {
      throw new Error(
        'El evento no contiene una transacción de Wompi.'
      );
    }

    return evento.data.transaction;
  },

  // =========================================
  // VALIDAR DATOS DEL PAGO
  // =========================================

  validarDatosPago: function (pago, transaccion) {
    if (!pago) {
      throw new Error(
        'No existe un pago asociado con la referencia recibida.'
      );
    }

    const referenciaPago = String(
      pago.referencia || ''
    ).trim();

    const referenciaWompi = String(
      transaccion.reference || ''
    ).trim();

    if (
      !referenciaPago ||
      referenciaPago !== referenciaWompi
    ) {
      throw new Error(
        'La referencia de Wompi no coincide con el pago.'
      );
    }

    const montoEsperado =
      WompiService.convertirACentavos(
        pago.valor
      );

    const montoRecibido = Number(
      transaccion.amount_in_cents
    );

    if (
      !Number.isSafeInteger(montoRecibido) ||
      montoRecibido !== montoEsperado
    ) {
      throw new Error(
        'El valor recibido de Wompi no coincide con el pago.'
      );
    }

    const monedaEsperada =
      WompiService.normalizarMoneda(
        pago.moneda || 'COP'
      );

    const monedaRecibida =
      WompiService.normalizarMoneda(
        transaccion.currency || 'COP'
      );

    if (monedaEsperada !== monedaRecibida) {
      throw new Error(
        'La moneda recibida de Wompi no coincide con el pago.'
      );
    }

    return true;
  },

  // =========================================
  // PROCESAR EVENTO WOMPI
  // =========================================

  procesarWompi: async function ({
    evento,
    checksumHeader = null
  }) {
    if (!evento || typeof evento !== 'object') {
      throw new Error(
        'No se recibió un evento válido.'
      );
    }

    const ambiente = String(
      evento.environment || ''
    )
      .trim()
      .toLowerCase();

    const config =
      WompiService.obtenerConfiguracion();

    const ambienteEsperado =
      config.sandbox
        ? 'test'
        : 'prod';

    if (
      ambiente &&
      ambiente !== ambienteEsperado
    ) {
      throw new Error(
        `El evento pertenece al ambiente "${ambiente}" y DemoFlow espera "${ambienteEsperado}".`
      );
    }

    const validacionFirma =
      this.validarFirmaWompi(
        evento,
        checksumHeader
      );

    if (!validacionFirma.valida) {
      const error = new Error(
        'La firma del webhook de Wompi no es válida.'
      );

      error.codigo = 'FIRMA_INVALIDA';

      throw error;
    }

    if (evento.event !== 'transaction.updated') {
      return {
        ok: true,
        procesado: false,
        ignorado: true,
        evento: evento.event,
        mensaje:
          'Evento válido, pero no requiere modificar un pago.'
      };
    }

    const transaccion =
      this.extraerTransaccion(evento);

    const referencia = String(
      transaccion.reference || ''
    ).trim();

    if (!referencia) {
      throw new Error(
        'La transacción de Wompi no contiene referencia.'
      );
    }

    const pago = await Pago.findOne({
      referencia
    });

    if (!pago) {
      const error = new Error(
        `No existe un pago con la referencia ${referencia}.`
      );

      error.codigo = 'PAGO_NO_ENCONTRADO';

      throw error;
    }

    this.validarDatosPago(
      pago,
      transaccion
    );

    const estadoWompi =
      this.normalizarEstadoWompi(
        transaccion.status
      );

    // Pago aprobado: activa beneficios de forma idempotente.
    if (estadoWompi === 'aprobado') {
      const resultado =
        await PagoService.aprobarPago(
          pago.id
        );

      sails.log.info(
        '✅ IA DemoFlow: Webhook Wompi aprobó el pago.',
        {
          pago: pago.id,
          referencia,
          transaccion: transaccion.id,
          estado: transaccion.status,
          metodo:
            transaccion.payment_method_type ||
            null
        }
      );

      return {
        ok: true,
        procesado: true,
        estado: 'aprobado',
        pago: resultado.pago,
        transaccionId:
          transaccion.id || null,
        mensaje:
          'Pago aprobado y beneficios activados.'
      };
    }

    // Pago rechazado o con error.
    if (estadoWompi === 'rechazado') {
      /*
       * No cambiamos un pago ya aprobado aunque llegue
       * posteriormente un evento inconsistente.
       */
      if (pago.estado === 'aprobado') {
        sails.log.warn(
          '⚠️ IA DemoFlow: Se ignoró un estado negativo para un pago ya aprobado.',
          {
            pago: pago.id,
            referencia,
            estadoWompi: transaccion.status
          }
        );

        return {
          ok: true,
          procesado: false,
          ignorado: true,
          estado: pago.estado,
          mensaje:
            'El pago ya estaba aprobado y no fue modificado.'
        };
      }

      const resultado =
        await PagoService.rechazarPago(
          pago.id
        );

      sails.log.info(
        '❌ IA DemoFlow: Webhook Wompi rechazó el pago.',
        {
          pago: pago.id,
          referencia,
          transaccion: transaccion.id,
          estado: transaccion.status
        }
      );

      return {
        ok: true,
        procesado: true,
        estado: 'rechazado',
        pago: resultado.pago,
        transaccionId:
          transaccion.id || null,
        mensaje:
          'Pago marcado como rechazado.'
      };
    }

    // PENDING u otro estado no final.
    sails.log.info(
      '⏳ IA DemoFlow: Webhook Wompi recibió un pago pendiente.',
      {
        pago: pago.id,
        referencia,
        transaccion: transaccion.id,
        estado: transaccion.status
      }
    );

    return {
      ok: true,
      procesado: false,
      pendiente: true,
      estado: 'pendiente',
      pago,
      transaccionId:
        transaccion.id || null,
      mensaje:
        'La transacción todavía está pendiente.'
    };
  }

};