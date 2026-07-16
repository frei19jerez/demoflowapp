/**
 * PaypalService.js
 *
 * Integración PayPal REST API para DemoFlowApp.
 *
 * Incluye:
 * - Configuración Sandbox / Live.
 * - OAuth 2.0.
 * - Creación de órdenes.
 * - Consulta de órdenes.
 * - Captura de órdenes.
 * - Consulta de capturas.
 * - Reembolsos.
 * - Verificación oficial de webhooks.
 * - Manejo de errores y registros.
 *
 * Compatible con:
 * - Sails.js 1.x
 * - Node.js 20+
 */

const crypto = require('crypto');

module.exports = {

  // Token OAuth almacenado temporalmente en memoria.
  _accessToken: null,
  _accessTokenExpiresAt: 0,

  // =========================================
  // CONFIGURACIÓN
  // =========================================

  obtenerConfiguracion: function () {
    const custom = sails.config.custom || {};
    const paypalCustom = custom.paypal || {};

    const environment = String(
      process.env.PAYPAL_ENV ||
      paypalCustom.environment ||
      (
        paypalCustom.sandbox === true
          ? 'sandbox'
          : 'live'
      )
    )
      .trim()
      .toLowerCase();

    const sandbox =
      environment === 'sandbox' ||
      environment === 'test';

    const clientId = String(
      process.env.PAYPAL_CLIENT_ID ||
      paypalCustom.clientId ||
      ''
    ).trim();

    const clientSecret = String(
      process.env.PAYPAL_CLIENT_SECRET ||
      paypalCustom.clientSecret ||
      ''
    ).trim();

    const webhookId = String(
      process.env.PAYPAL_WEBHOOK_ID ||
      paypalCustom.webhookId ||
      ''
    ).trim();

    const appUrl = String(
      process.env.APP_URL ||
      custom.appUrl ||
      'http://localhost:1337'
    ).replace(/\/+$/, '');

    const apiUrl = String(
      process.env.PAYPAL_API_URL ||
      paypalCustom.apiUrl ||
      (
        sandbox
          ? 'https://api-m.sandbox.paypal.com'
          : 'https://api-m.paypal.com'
      )
    ).replace(/\/+$/, '');

    const marca = String(
      process.env.PAYPAL_BRAND_NAME ||
      paypalCustom.brandName ||
      'DemoFlowApp'
    ).trim();

    return {
      environment,
      sandbox,
      clientId,
      clientSecret,
      webhookId,
      appUrl,
      apiUrl,
      marca
    };
  },

  // =========================================
  // VALIDAR CONFIGURACIÓN
  // =========================================

  validarConfiguracion: function ({
    requiereWebhook = false
  } = {}) {
    const config = this.obtenerConfiguracion();
    const faltantes = [];

    if (!config.clientId) {
      faltantes.push('PAYPAL_CLIENT_ID');
    }

    if (!config.clientSecret) {
      faltantes.push('PAYPAL_CLIENT_SECRET');
    }

    if (requiereWebhook && !config.webhookId) {
      faltantes.push('PAYPAL_WEBHOOK_ID');
    }

    if (faltantes.length > 0) {
      throw new Error(
        `Faltan variables de PayPal: ${faltantes.join(', ')}.`
      );
    }

    return config;
  },

  // =========================================
  // MONEDAS ADMITIDAS
  // =========================================

  monedasAdmitidas: function () {
    /*
     * Monedas comúnmente admitidas por el Checkout
     * estándar de PayPal.
     *
     * COP no se incluye para evitar crear una orden
     * inválida con el flujo estándar.
     */
    return [
      'AUD',
      'BRL',
      'CAD',
      'CNY',
      'CZK',
      'DKK',
      'EUR',
      'HKD',
      'HUF',
      'ILS',
      'JPY',
      'MYR',
      'MXN',
      'TWD',
      'NZD',
      'NOK',
      'PHP',
      'PLN',
      'GBP',
      'SGD',
      'SEK',
      'CHF',
      'THB',
      'USD'
    ];
  },

  normalizarMoneda: function (moneda) {
    const monedaFinal = String(
      moneda || 'USD'
    )
      .trim()
      .toUpperCase();

    if (
      !this.monedasAdmitidas().includes(
        monedaFinal
      )
    ) {
      throw new Error(
        `La moneda ${monedaFinal} no está habilitada en esta integración estándar de PayPal. ` +
        'Configura para PayPal un precio internacional en USD, EUR u otra moneda admitida.'
      );
    }

    return monedaFinal;
  },

  // =========================================
  // FORMATEAR VALOR
  // =========================================

  formatearValor: function (
    valor,
    moneda = 'USD'
  ) {
    const numero = Number(valor);

    if (
      !Number.isFinite(numero) ||
      numero <= 0
    ) {
      throw new Error(
        'El valor de la orden PayPal debe ser mayor que cero.'
      );
    }

    const monedaFinal =
      this.normalizarMoneda(moneda);

    /*
     * Estas monedas normalmente no utilizan
     * decimales en PayPal.
     */
    const sinDecimales = [
      'HUF',
      'JPY',
      'TWD'
    ];

    if (
      sinDecimales.includes(monedaFinal)
    ) {
      return String(Math.round(numero));
    }

    return numero.toFixed(2);
  },

  // =========================================
  // IDENTIFICADOR DE SOLICITUD
  // =========================================

  crearRequestId: function (
    prefijo = 'DF-PAYPAL'
  ) {
    return (
      `${prefijo}-` +
      `${Date.now()}-` +
      crypto.randomBytes(8).toString('hex')
    ).slice(0, 108);
  },

  // =========================================
  // OBTENER TOKEN OAUTH
  // =========================================

  obtenerAccessToken: async function ({
    forzarNuevo = false
  } = {}) {
    const config =
      this.validarConfiguracion();

    const ahora = Date.now();

    if (
      !forzarNuevo &&
      this._accessToken &&
      this._accessTokenExpiresAt >
        ahora + 60000
    ) {
      return this._accessToken;
    }

    const credenciales = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString('base64');

    let respuesta;

    try {
      respuesta = await fetch(
        `${config.apiUrl}/v1/oauth2/token`,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Basic ${credenciales}`,

            Accept:
              'application/json',

            'Accept-Language':
              'es_CO',

            'Content-Type':
              'application/x-www-form-urlencoded'
          },

          body:
            'grant_type=client_credentials'
        }
      );
    } catch (error) {
      throw new Error(
        `No fue posible conectarse con PayPal: ${error.message}`
      );
    }

    const cuerpo =
      await this.leerRespuesta(respuesta);

    if (
      !respuesta.ok ||
      !cuerpo ||
      !cuerpo.access_token
    ) {
      throw this.crearErrorApi({
        mensaje:
          'PayPal rechazó la autenticación OAuth.',
        respuesta,
        cuerpo
      });
    }

    const expiresIn =
      Number(cuerpo.expires_in || 300);

    this._accessToken =
      cuerpo.access_token;

    this._accessTokenExpiresAt =
      Date.now() +
      expiresIn * 1000;

    sails.log.info(
      '🟡 IA DemoFlow: Token OAuth de PayPal obtenido.',
      {
        ambiente:
          config.environment,
        expiraEnSegundos:
          expiresIn
      }
    );

    return this._accessToken;
  },

  // =========================================
  // LEER RESPUESTA HTTP
  // =========================================

  leerRespuesta: async function (
    respuesta
  ) {
    const texto = await respuesta.text();

    if (!texto) {
      return null;
    }

    try {
      return JSON.parse(texto);
    } catch (error) {
      return {
        raw: texto
      };
    }
  },

  // =========================================
  // CREAR ERROR DE API
  // =========================================

  crearErrorApi: function ({
    mensaje,
    respuesta = null,
    cuerpo = null
  }) {
    const detalles = [];

    if (cuerpo && cuerpo.message) {
      detalles.push(cuerpo.message);
    }

    if (
      cuerpo &&
      Array.isArray(cuerpo.details)
    ) {
      for (
        const detalle of cuerpo.details
      ) {
        if (detalle.description) {
          detalles.push(
            detalle.description
          );
        } else if (detalle.issue) {
          detalles.push(
            detalle.issue
          );
        }
      }
    }

    const error = new Error(
      detalles.length > 0
        ? `${mensaje} ${detalles.join(' ')}`
        : mensaje
    );

    error.status =
      respuesta
        ? respuesta.status
        : 500;

    error.paypal =
      cuerpo || null;

    return error;
  },

  // =========================================
  // SOLICITUD GENERAL A PAYPAL
  // =========================================

  solicitar: async function ({
    method = 'GET',
    path,
    body = null,
    requestId = null,
    headers = {}
  }) {
    if (!path) {
      throw new Error(
        'La ruta de PayPal es obligatoria.'
      );
    }

    const config =
      this.validarConfiguracion();

    let token =
      await this.obtenerAccessToken();

    const ejecutar = async (
      accessToken
    ) => {
      const cabeceras = {
        Authorization:
          `Bearer ${accessToken}`,

        Accept:
          'application/json',

        'Content-Type':
          'application/json',

        'Accept-Language':
          'es_CO',

        ...headers
      };

      if (requestId) {
        cabeceras[
          'PayPal-Request-Id'
        ] = requestId;
      }

      return await fetch(
        `${config.apiUrl}${path}`,
        {
          method,
          headers: cabeceras,
          body:
            body === null
              ? undefined
              : JSON.stringify(body)
        }
      );
    };

    let respuesta;

    try {
      respuesta =
        await ejecutar(token);
    } catch (error) {
      throw new Error(
        `Error de conexión con PayPal: ${error.message}`
      );
    }

    /*
     * Si PayPal indica que el token venció,
     * obtenemos uno nuevo e intentamos una vez.
     */
    if (respuesta.status === 401) {
      token =
        await this.obtenerAccessToken({
          forzarNuevo: true
        });

      respuesta =
        await ejecutar(token);
    }

    const cuerpo =
      await this.leerRespuesta(respuesta);

    if (!respuesta.ok) {
      sails.log.error(
        '❌ IA DemoFlow: PayPal respondió con error.',
        {
          method,
          path,
          status:
            respuesta.status,
          cuerpo
        }
      );

      throw this.crearErrorApi({
        mensaje:
          `PayPal respondió HTTP ${respuesta.status}.`,
        respuesta,
        cuerpo
      });
    }

    return cuerpo;
  },

  // =========================================
  // OBTENER PRECIO INTERNACIONAL
  // =========================================

  obtenerDatosMonetarios: function (
    pago
  ) {
    if (!pago) {
      throw new Error(
        'El pago es obligatorio.'
      );
    }

    /*
     * Si el registro ya viene en una moneda
     * admitida, se utiliza directamente.
     *
     * Para planes colombianos registrados en COP,
     * deben configurarse valores internacionales
     * separados en el .env.
     */
    const monedaPago = String(
      pago.moneda || ''
    )
      .trim()
      .toUpperCase();

    if (
      this.monedasAdmitidas().includes(
        monedaPago
      )
    ) {
      return {
        moneda: monedaPago,
        valor: Number(pago.valor)
      };
    }

    const plan = String(
      pago.plan || 'pro'
    )
      .trim()
      .toUpperCase();

    const moneda = String(
      process.env.PAYPAL_CURRENCY ||
      'USD'
    )
      .trim()
      .toUpperCase();

    const variablePrecio =
      `PAYPAL_PRICE_${plan}`;

    const precioConfigurado =
      process.env[variablePrecio];

    if (
      typeof precioConfigurado ===
        'undefined' ||
      precioConfigurado === ''
    ) {
      throw new Error(
        `El pago está registrado en ${monedaPago || 'una moneda no definida'}, ` +
        `pero PayPal necesita un precio internacional. ` +
        `Agrega ${variablePrecio} y PAYPAL_CURRENCY al archivo .env.`
      );
    }

    return {
      moneda:
        this.normalizarMoneda(moneda),

      valor:
        Number(precioConfigurado)
    };
  },

  // =========================================
  // CREAR ORDEN
  // =========================================

  crearOrden: async function (pago) {
    if (!pago || !pago.id) {
      throw new Error(
        'Se requiere un pago válido para crear la orden PayPal.'
      );
    }

    if (!pago.referencia) {
      throw new Error(
        'El pago no contiene una referencia.'
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

    const config =
      this.validarConfiguracion();

    const datosMonetarios =
      this.obtenerDatosMonetarios(pago);

    const moneda =
      this.normalizarMoneda(
        datosMonetarios.moneda
      );

    const valor =
      this.formatearValor(
        datosMonetarios.valor,
        moneda
      );

    const referencia = String(
      pago.referencia
    ).trim();

    const requestId =
      `CREATE-${referencia}`.slice(
        0,
        108
      );

    const cuerpo = {
      intent: 'CAPTURE',

      purchase_units: [
        {
          reference_id:
            referencia,

          custom_id:
            String(pago.id),

          invoice_id:
            referencia.slice(0, 127),

          description:
            `Suscripción ${String(
              pago.plan || 'pro'
            ).toUpperCase()} de DemoFlowApp`
              .slice(0, 127),

          amount: {
            currency_code:
              moneda,

            value:
              valor
          }
        }
      ],

      payment_source: {
        paypal: {
          experience_context: {
            brand_name:
              config.marca.slice(
                0,
                127
              ),

            locale:
              'es-CO',

            landing_page:
              'LOGIN',

            user_action:
              'PAY_NOW',

            shipping_preference:
              'NO_SHIPPING',

            return_url:
              `${config.appUrl}/pago/paypal/retorno`,

            cancel_url:
              `${config.appUrl}/pago/${pago.id}?paypal=cancelado`
          }
        }
      }
    };

    const orden =
      await this.solicitar({
        method: 'POST',
        path: '/v2/checkout/orders',
        body: cuerpo,
        requestId
      });

    const enlaceAprobacion =
      Array.isArray(orden.links)
        ? orden.links.find(function (
            enlace
          ) {
            return (
              enlace.rel ===
                'payer-action' ||
              enlace.rel ===
                'approve'
            );
          })
        : null;

    if (
      !orden.id ||
      !enlaceAprobacion ||
      !enlaceAprobacion.href
    ) {
      throw new Error(
        'PayPal creó una respuesta sin enlace de aprobación.'
      );
    }

    sails.log.info(
      '🟡 IA DemoFlow: Orden PayPal creada.',
      {
        pago: pago.id,
        referencia,
        ordenId: orden.id,
        moneda,
        valor,
        ambiente:
          config.environment
      }
    );

    return {
      ok: true,
      metodo: 'paypal',

      pago,

      ordenId:
        orden.id,

      referencia,

      estado:
        orden.status,

      moneda,

      valor:
        Number(valor),

      url:
        enlaceAprobacion.href,

      approveUrl:
        enlaceAprobacion.href,

      orden,

      mensaje:
        'Orden PayPal creada correctamente.'
    };
  },

  // =========================================
  // CONSULTAR ORDEN
  // =========================================

  consultarOrden: async function (
    ordenId
  ) {
    const id = String(
      ordenId || ''
    ).trim();

    if (!id) {
      throw new Error(
        'El ID de la orden PayPal es obligatorio.'
      );
    }

    const orden =
      await this.solicitar({
        method: 'GET',
        path:
          `/v2/checkout/orders/${encodeURIComponent(id)}`
      });

    return {
      ok: true,
      metodo: 'paypal',
      ordenId: id,
      estado:
        orden.status || null,
      orden
    };
  },

  // =========================================
  // CAPTURAR ORDEN
  // =========================================

  capturarOrden: async function (
    ordenId
  ) {
    const id = String(
      ordenId || ''
    ).trim();

    if (!id) {
      throw new Error(
        'El ID de la orden PayPal es obligatorio.'
      );
    }

    /*
     * Consultamos primero para evitar intentar
     * capturar nuevamente una orden completada.
     */
    const consulta =
      await this.consultarOrden(id);

    if (
      consulta.orden &&
      consulta.orden.status ===
        'COMPLETED'
    ) {
      return {
        ok: true,
        metodo: 'paypal',
        yaCapturada: true,
        ordenId: id,
        estado: 'COMPLETED',
        captura:
          this.extraerCaptura(
            consulta.orden
          ),
        orden:
          consulta.orden,
        mensaje:
          'La orden PayPal ya estaba capturada.'
      };
    }

    if (
      consulta.orden &&
      consulta.orden.status !==
        'APPROVED'
    ) {
      throw new Error(
        `La orden PayPal está en estado ${consulta.orden.status || 'desconocido'} y todavía no puede capturarse.`
      );
    }

    const respuesta =
      await this.solicitar({
        method: 'POST',

        path:
          `/v2/checkout/orders/${encodeURIComponent(id)}/capture`,

        body: {},

        requestId:
          `CAPTURE-${id}`.slice(
            0,
            108
          )
      });

    const captura =
      this.extraerCaptura(
        respuesta
      );

    sails.log.info(
      '✅ IA DemoFlow: Orden PayPal capturada.',
      {
        ordenId: id,
        estado:
          respuesta.status,
        capturaId:
          captura
            ? captura.id
            : null
      }
    );

    return {
      ok:
        respuesta.status ===
        'COMPLETED',

      metodo:
        'paypal',

      ordenId:
        id,

      estado:
        respuesta.status,

      captura,

      orden:
        respuesta,

      mensaje:
        respuesta.status ===
          'COMPLETED'
          ? 'Pago PayPal capturado correctamente.'
          : 'PayPal recibió la captura, pero todavía no está completada.'
    };
  },

  // =========================================
  // EXTRAER CAPTURA
  // =========================================

  extraerCaptura: function (
    orden
  ) {
    try {
      const unidades =
        orden.purchase_units || [];

      for (
        const unidad of unidades
      ) {
        const capturas =
          unidad &&
          unidad.payments &&
          Array.isArray(
            unidad.payments.captures
          )
            ? unidad.payments.captures
            : [];

        if (capturas.length > 0) {
          return capturas[0];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  // =========================================
  // VERIFICAR ORDEN
  // =========================================

  verificar: async function (
    ordenId
  ) {
    const resultado =
      await this.consultarOrden(
        ordenId
      );

    const orden =
      resultado.orden;

    const captura =
      this.extraerCaptura(orden);

    const completada =
      orden.status ===
        'COMPLETED' ||
      (
        captura &&
        captura.status ===
          'COMPLETED'
      );

    return {
      ok: true,
      metodo: 'paypal',
      verificada: completada,
      estado:
        captura
          ? captura.status
          : orden.status,
      ordenId:
        orden.id,
      captura,
      orden,
      mensaje:
        completada
          ? 'Pago PayPal verificado como completado.'
          : 'El pago PayPal todavía no está completado.'
    };
  },

  // =========================================
  // CONSULTAR CAPTURA
  // =========================================

  consultarCaptura: async function (
    capturaId
  ) {
    const id = String(
      capturaId || ''
    ).trim();

    if (!id) {
      throw new Error(
        'El ID de la captura es obligatorio.'
      );
    }

    const captura =
      await this.solicitar({
        method: 'GET',
        path:
          `/v2/payments/captures/${encodeURIComponent(id)}`
      });

    return {
      ok: true,
      captura
    };
  },

  // =========================================
  // REEMBOLSAR CAPTURA
  // =========================================

  reembolsar: async function ({
    capturaId,
    valor = null,
    moneda = null,
    nota = null
  }) {
    const id = String(
      capturaId || ''
    ).trim();

    if (!id) {
      throw new Error(
        'El ID de la captura PayPal es obligatorio.'
      );
    }

    const cuerpo = {};

    if (
      valor !== null &&
      typeof valor !== 'undefined'
    ) {
      const monedaFinal =
        this.normalizarMoneda(
          moneda || 'USD'
        );

      cuerpo.amount = {
        currency_code:
          monedaFinal,

        value:
          this.formatearValor(
            valor,
            monedaFinal
          )
      };
    }

    if (nota) {
      cuerpo.note_to_payer =
        String(nota).slice(
          0,
          255
        );
    }

    const reembolso =
      await this.solicitar({
        method: 'POST',

        path:
          `/v2/payments/captures/${encodeURIComponent(id)}/refund`,

        body:
          cuerpo,

        requestId:
          this.crearRequestId(
            'REFUND'
          )
      });

    sails.log.info(
      '↩️ IA DemoFlow: Reembolso PayPal solicitado.',
      {
        capturaId: id,
        reembolsoId:
          reembolso.id || null,
        estado:
          reembolso.status || null
      }
    );

    return {
      ok: true,
      reembolso
    };
  },

  // =========================================
  // OBTENER CABECERA PAYPAL
  // =========================================

  obtenerHeader: function (
    headers,
    nombre
  ) {
    if (!headers) {
      return null;
    }

    const buscado =
      String(nombre)
        .toLowerCase();

    for (
      const clave of Object.keys(
        headers
      )
    ) {
      if (
        String(clave)
          .toLowerCase() ===
        buscado
      ) {
        return headers[clave];
      }
    }

    return null;
  },

  // =========================================
  // VERIFICAR FIRMA DE WEBHOOK
  // =========================================

  verificarWebhook: async function ({
    headers,
    evento
  }) {
    if (
      !evento ||
      typeof evento !== 'object'
    ) {
      throw new Error(
        'El evento PayPal no es válido.'
      );
    }

    const config =
      this.validarConfiguracion({
        requiereWebhook: true
      });

    const authAlgo =
      this.obtenerHeader(
        headers,
        'paypal-auth-algo'
      );

    const certUrl =
      this.obtenerHeader(
        headers,
        'paypal-cert-url'
      );

    const transmissionId =
      this.obtenerHeader(
        headers,
        'paypal-transmission-id'
      );

    const transmissionSig =
      this.obtenerHeader(
        headers,
        'paypal-transmission-sig'
      );

    const transmissionTime =
      this.obtenerHeader(
        headers,
        'paypal-transmission-time'
      );

    const faltantes = [];

    if (!authAlgo) {
      faltantes.push(
        'paypal-auth-algo'
      );
    }

    if (!certUrl) {
      faltantes.push(
        'paypal-cert-url'
      );
    }

    if (!transmissionId) {
      faltantes.push(
        'paypal-transmission-id'
      );
    }

    if (!transmissionSig) {
      faltantes.push(
        'paypal-transmission-sig'
      );
    }

    if (!transmissionTime) {
      faltantes.push(
        'paypal-transmission-time'
      );
    }

    if (faltantes.length > 0) {
      throw new Error(
        `Faltan cabeceras del webhook PayPal: ${faltantes.join(', ')}.`
      );
    }

    const respuesta =
      await this.solicitar({
        method: 'POST',

        path:
          '/v1/notifications/verify-webhook-signature',

        body: {
          auth_algo:
            authAlgo,

          cert_url:
            certUrl,

          transmission_id:
            transmissionId,

          transmission_sig:
            transmissionSig,

          transmission_time:
            transmissionTime,

          webhook_id:
            config.webhookId,

          webhook_event:
            evento
        },

        requestId:
          this.crearRequestId(
            'VERIFY-WEBHOOK'
          )
      });

    const verificada =
      String(
        respuesta.verification_status ||
        ''
      ).toUpperCase() ===
      'SUCCESS';

    if (!verificada) {
      sails.log.warn(
        '⚠️ IA DemoFlow: Webhook PayPal con firma inválida.',
        {
          eventoId:
            evento.id || null,

          tipo:
            evento.event_type ||
            null,

          estado:
            respuesta.verification_status ||
            null
        }
      );
    }

    return {
      ok: verificada,
      verificada,
      estado:
        respuesta.verification_status ||
        null,
      respuesta
    };
  },

  // =========================================
  // EXTRAER DATOS DE EVENTO
  // =========================================

  extraerDatosWebhook: function (
    evento
  ) {
    const recurso =
      evento &&
      evento.resource
        ? evento.resource
        : {};

    const tipo = String(
      evento &&
      evento.event_type
        ? evento.event_type
        : ''
    )
      .trim()
      .toUpperCase();

    let referencia = null;
    let customId = null;
    let ordenId = null;
    let capturaId = null;
    let estado = null;
    let valor = null;
    let moneda = null;

    if (
      recurso.supplementary_data &&
      recurso.supplementary_data
        .related_ids
    ) {
      ordenId =
        recurso.supplementary_data
          .related_ids.order_id ||
        null;
    }

    if (
      tipo.startsWith(
        'CHECKOUT.ORDER.'
      )
    ) {
      ordenId =
        recurso.id || ordenId;

      estado =
        recurso.status || null;

      const unidad =
        Array.isArray(
          recurso.purchase_units
        )
          ? recurso.purchase_units[0]
          : null;

      if (unidad) {
        referencia =
          unidad.reference_id ||
          unidad.invoice_id ||
          null;

        customId =
          unidad.custom_id ||
          null;

        if (unidad.amount) {
          valor =
            unidad.amount.value ||
            null;

          moneda =
            unidad.amount
              .currency_code ||
            null;
        }
      }
    }

    if (
      tipo.startsWith(
        'PAYMENT.CAPTURE.'
      )
    ) {
      capturaId =
        recurso.id || null;

      estado =
        recurso.status || null;

      referencia =
        recurso.invoice_id ||
        recurso.custom_id ||
        null;

      customId =
        recurso.custom_id ||
        null;

      if (recurso.amount) {
        valor =
          recurso.amount.value ||
          null;

        moneda =
          recurso.amount
            .currency_code ||
          null;
      }
    }

    return {
      tipo,
      recurso,
      referencia,
      customId,
      ordenId,
      capturaId,
      estado,
      valor,
      moneda
    };
  },

  // =========================================
  // COMPROBAR DISPONIBILIDAD
  // =========================================

  probarConexion: async function () {
    const config =
      this.validarConfiguracion();

    await this.obtenerAccessToken({
      forzarNuevo: true
    });

    return {
      ok: true,
      metodo: 'paypal',
      ambiente:
        config.environment,
      apiUrl:
        config.apiUrl,
      mensaje:
        'Conexión OAuth con PayPal correcta.'
    };
  }

};