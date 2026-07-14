/**
 * WompiService.js
 *
 * Servicio de integración de DemoFlowApp con Wompi Colombia.
 *
 * Funciones principales:
 * - Leer y validar la configuración de Wompi.
 * - Convertir valores a centavos.
 * - Generar la firma de integridad SHA-256.
 * - Preparar los datos del Web Checkout.
 * - Consultar una transacción directamente en Wompi.
 */

const crypto = require('crypto');

module.exports = {

  // =========================================
  // OBTENER CONFIGURACIÓN
  // =========================================

  obtenerConfiguracion: function () {
    const custom = sails.config.custom || {};
    const wompi = custom.wompi || {};

    const sandbox =
      wompi.sandbox === true ||
      String(process.env.WOMPI_SANDBOX || '').toLowerCase() === 'true';

    const publicKey =
      wompi.publicKey ||
      process.env.WOMPI_PUBLIC_KEY ||
      '';

    const privateKey =
      wompi.privateKey ||
      process.env.WOMPI_PRIVATE_KEY ||
      '';

    const integritySecret =
      wompi.integritySecret ||
      process.env.WOMPI_INTEGRITY_SECRET ||
      '';

    const eventsSecret =
      wompi.eventsSecret ||
      process.env.WOMPI_EVENTS_SECRET ||
      '';

    const apiUrl =
      wompi.apiUrl ||
      process.env.WOMPI_API_URL ||
      (
        sandbox
          ? 'https://sandbox.wompi.co/v1'
          : 'https://production.wompi.co/v1'
      );

    const checkoutUrl =
      wompi.checkoutUrl ||
      'https://checkout.wompi.co/p/';

    const appUrl = String(
      custom.appUrl ||
      process.env.APP_URL ||
      'http://localhost:1337'
    ).replace(/\/+$/, '');

    return {
      sandbox,
      publicKey,
      privateKey,
      integritySecret,
      eventsSecret,
      apiUrl: String(apiUrl).replace(/\/+$/, ''),
      checkoutUrl,
      appUrl
    };
  },

  // =========================================
  // VALIDAR CONFIGURACIÓN DE CHECKOUT
  // =========================================

  validarConfiguracionCheckout: function () {
    const config = this.obtenerConfiguracion();

    const faltantes = [];

    if (!config.publicKey) {
      faltantes.push('WOMPI_PUBLIC_KEY');
    }

    if (!config.integritySecret) {
      faltantes.push('WOMPI_INTEGRITY_SECRET');
    }

    if (faltantes.length > 0) {
      throw new Error(
        `Faltan variables de Wompi para el checkout: ${faltantes.join(', ')}.`
      );
    }

    return config;
  },

  // =========================================
  // VALIDAR CONFIGURACIÓN DEL WEBHOOK
  // =========================================

  validarConfiguracionWebhook: function () {
    const config = this.obtenerConfiguracion();

    if (!config.eventsSecret) {
      throw new Error(
        'Falta configurar WOMPI_EVENTS_SECRET.'
      );
    }

    return config;
  },

  // =========================================
  // CONVERTIR PESOS A CENTAVOS
  // =========================================

  convertirACentavos: function (valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
      throw new Error(
        'El valor del pago debe ser un número mayor que cero.'
      );
    }

    return Math.round(numero * 100);
  },

  // =========================================
  // NORMALIZAR MONEDA
  // =========================================

  normalizarMoneda: function (moneda = 'COP') {
    const monedaFinal = String(moneda || 'COP')
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(monedaFinal)) {
      throw new Error('La moneda del pago no es válida.');
    }

    return monedaFinal;
  },

  // =========================================
  // GENERAR FIRMA DE INTEGRIDAD
  // =========================================

  generarFirmaIntegridad: function ({
    referencia,
    montoCentavos,
    moneda = 'COP',
    expirationTime = null
  }) {
    const config = this.validarConfiguracionCheckout();

    const referenciaFinal = String(referencia || '').trim();
    const monedaFinal = this.normalizarMoneda(moneda);
    const montoFinal = Number(montoCentavos);

    if (!referenciaFinal) {
      throw new Error(
        'La referencia es obligatoria para generar la firma de Wompi.'
      );
    }

    if (
      !Number.isSafeInteger(montoFinal) ||
      montoFinal <= 0
    ) {
      throw new Error(
        'El monto en centavos debe ser un entero mayor que cero.'
      );
    }

    let cadena =
      referenciaFinal +
      montoFinal +
      monedaFinal;

    if (expirationTime) {
      cadena += String(expirationTime);
    }

    cadena += config.integritySecret;

    return crypto
      .createHash('sha256')
      .update(cadena, 'utf8')
      .digest('hex');
  },

  // =========================================
  // PREPARAR CHECKOUT
  // =========================================

  prepararCheckout: async function (pago, usuario = null) {
    if (!pago || !pago.id) {
      throw new Error(
        'Se requiere un pago válido para preparar Wompi.'
      );
    }

    if (!pago.referencia) {
      throw new Error(
        'El pago no tiene una referencia válida.'
      );
    }

    if (pago.estado === 'aprobado') {
      throw new Error(
        'Este pago ya fue aprobado.'
      );
    }

    if (pago.estado === 'rechazado') {
      throw new Error(
        'Este pago fue rechazado. Crea un pago nuevo.'
      );
    }

    const config = this.validarConfiguracionCheckout();

    const montoCentavos = this.convertirACentavos(
      pago.valor
    );

    const moneda = this.normalizarMoneda(
      pago.moneda || 'COP'
    );

    const referencia = String(
      pago.referencia
    ).trim();

    const firmaIntegridad =
      this.generarFirmaIntegridad({
        referencia,
        montoCentavos,
        moneda
      });

    const redirectUrl =
      `${config.appUrl}/pago/wompi/resultado`;

    const cliente = usuario
      ? {
          email:
            usuario.email ||
            usuario.correo ||
            null,

          nombre:
            usuario.nombre ||
            usuario.name ||
            null,

          telefono:
            usuario.telefono ||
            usuario.celular ||
            null,

          documento:
            usuario.documento ||
            usuario.identificacion ||
            usuario.cedula ||
            null,

          tipoDocumento:
            usuario.tipoDocumento ||
            usuario.tipo_documento ||
            'CC'
        }
      : {};

    return {
      ok: true,

      checkoutUrl: config.checkoutUrl,
      publicKey: config.publicKey,

      moneda,
      montoCentavos,
      referencia,
      firmaIntegridad,
      redirectUrl,

      cliente,

      pago: {
        id: pago.id,
        plan: pago.plan,
        valor: Number(pago.valor),
        moneda,
        estado: pago.estado
      },

      sandbox: config.sandbox,

      mensaje:
        'Checkout de Wompi preparado correctamente.'
    };
  },

  // =========================================
  // ALIAS PARA PAGO SERVICE
  // =========================================

  crearTransaccion: async function (pago, usuario = null) {
    return await this.prepararCheckout(
      pago,
      usuario
    );
  },

  // =========================================
  // CONSULTAR TRANSACCIÓN EN WOMPI
  // =========================================

  consultarTransaccion: async function (transaccionId) {
    const id = String(transaccionId || '').trim();

    if (!id) {
      throw new Error(
        'El ID de la transacción de Wompi es obligatorio.'
      );
    }

    const config = this.obtenerConfiguracion();

    const headers = {
      Accept: 'application/json'
    };

    /*
     * La consulta pública de una transacción normalmente
     * puede hacerse sin la llave privada.
     *
     * Si está configurada, se envía como Bearer para
     * soportar operaciones que requieran autenticación.
     */
    if (config.privateKey) {
      headers.Authorization =
        `Bearer ${config.privateKey}`;
    }

    const url =
      `${config.apiUrl}/transactions/${encodeURIComponent(id)}`;

    const respuesta = await fetch(url, {
      method: 'GET',
      headers
    });

    let cuerpo = null;

    try {
      cuerpo = await respuesta.json();
    } catch (error) {
      cuerpo = null;
    }

    if (!respuesta.ok) {
      const mensaje =
        cuerpo &&
        cuerpo.error &&
        cuerpo.error.reason
          ? cuerpo.error.reason
          : `Wompi respondió HTTP ${respuesta.status}.`;

      throw new Error(
        `No fue posible consultar la transacción: ${mensaje}`
      );
    }

    const transaccion =
      cuerpo && cuerpo.data
        ? cuerpo.data
        : cuerpo;

    return {
      ok: true,
      transaccion
    };
  }

};