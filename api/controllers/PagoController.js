/**
 * PagoController.js
 * Controlador central de pagos de DemoFlowApp
 *
 * Métodos soportados:
 * - Wompi
 * - PayPal
 * - Aprobación manual administrativa
 * - Rechazo manual administrativo
 *
 * Flujo PayPal:
 * 1. Se crea el pago local.
 * 2. Se crea la orden PayPal.
 * 3. El usuario aprueba el pago en PayPal.
 * 4. PayPal devuelve al usuario a retornoPaypal.
 * 5. DemoFlow captura la orden desde el servidor.
 * 6. Se valida referencia, usuario, moneda y valor.
 * 7. PagoService activa pago, suscripción, Premium y créditos IA.
 */

'use strict';

// =============================================
// FUNCIONES AUXILIARES
// =============================================

/**
 * Obtiene de forma segura el ID del usuario
 * autenticado en la sesión.
 */
function obtenerUsuarioSesion(req) {
  if (
    !req ||
    !req.session ||
    !req.session.userId
  ) {
    return null;
  }

  const usuarioId = Number(req.session.userId);

  return Number.isSafeInteger(usuarioId) &&
    usuarioId > 0
    ? usuarioId
    : null;
}

/**
 * Normaliza un texto.
 */
function normalizarTexto(valor) {
  return String(
    typeof valor === 'undefined' ||
    valor === null
      ? ''
      : valor
  ).trim();
}

/**
 * Normaliza un estado a mayúsculas.
 */
function normalizarEstado(valor) {
  return normalizarTexto(valor).toUpperCase();
}

/**
 * Obtiene la primera unidad de compra
 * incluida en una orden PayPal.
 */
function obtenerUnidadCompraPaypal(orden) {
  if (
    !orden ||
    !Array.isArray(orden.purchase_units) ||
    orden.purchase_units.length === 0
  ) {
    return null;
  }

  return orden.purchase_units[0] || null;
}

/**
 * Obtiene la referencia local enviada a PayPal.
 */
function obtenerReferenciaPaypal(unidad) {
  if (!unidad) {
    return '';
  }

  return normalizarTexto(
    unidad.reference_id ||
    unidad.invoice_id ||
    ''
  );
}

/**
 * Obtiene el ID local del pago almacenado
 * en custom_id.
 */
function obtenerPagoIdPaypal(unidad) {
  if (!unidad || !unidad.custom_id) {
    return null;
  }

  const pagoId = Number(unidad.custom_id);

  if (
    !Number.isSafeInteger(pagoId) ||
    pagoId <= 0
  ) {
    return null;
  }

  return pagoId;
}

/**
 * Obtiene los datos principales del comprador.
 */
function obtenerPagadorPaypal(orden) {
  const payer =
    orden && orden.payer
      ? orden.payer
      : {};

  const nombre =
    payer && payer.name
      ? [
          payer.name.given_name || '',
          payer.name.surname || ''
        ]
          .join(' ')
          .trim()
      : '';

  return {
    payerId:
      normalizarTexto(
        payer.payer_id || ''
      ) || null,

    email:
      normalizarTexto(
        payer.email_address || ''
      ).toLowerCase() || null,

    nombre:
      nombre || null,

    pais:
      normalizarTexto(
        payer.address &&
        payer.address.country_code
          ? payer.address.country_code
          : ''
      ).toUpperCase() || null
  };
}

/**
 * Obtiene el monto capturado o, como respaldo,
 * el monto de la unidad de compra.
 */
function obtenerMontoPaypal(captura, unidad) {
  if (
    captura &&
    captura.amount
  ) {
    return captura.amount;
  }

  if (
    unidad &&
    unidad.amount
  ) {
    return unidad.amount;
  }

  return null;
}

/**
 * Compara dos importes monetarios con dos decimales.
 */
function importesCoinciden(valorA, valorB) {
  const numeroA = Number(valorA);
  const numeroB = Number(valorB);

  if (
    !Number.isFinite(numeroA) ||
    !Number.isFinite(numeroB)
  ) {
    return false;
  }

  return (
    Math.round(numeroA * 100) ===
    Math.round(numeroB * 100)
  );
}

/**
 * Busca un pago PayPal usando primero custom_id
 * y luego la referencia como respaldo.
 */
async function buscarPagoPaypal(
  pagoIdPersonalizado,
  referencia
) {
  let pago = null;

  if (pagoIdPersonalizado) {
    pago = await Pago.findOne({
      id: pagoIdPersonalizado
    });
  }

  if (!pago && referencia) {
    pago = await Pago.findOne({
      referencia
    });
  }

  return pago;
}

/**
 * Comprueba si el pago pertenece al usuario
 * autenticado.
 */
function pagoPerteneceAlUsuario(
  pago,
  usuarioId
) {
  if (!pago || !usuarioId) {
    return false;
  }

  return (
    Number(pago.usuario) ===
    Number(usuarioId)
  );
}

/**
 * Construye la URL para mostrar un pago.
 */
function construirUrlPago(
  pagoId,
  parametros = {}
) {
  const query = new URLSearchParams();

  Object.keys(parametros).forEach(
    (clave) => {
      const valor = parametros[clave];

      if (
        valor !== null &&
        typeof valor !== 'undefined' &&
        String(valor).trim() !== ''
      ) {
        query.set(
          clave,
          String(valor)
        );
      }
    }
  );

  const cadena = query.toString();

  return `/pago/${pagoId}${
    cadena ? `?${cadena}` : ''
  }`;
}

/**
 * Evita mostrar detalles técnicos sensibles
 * en mensajes enviados al navegador.
 */
function obtenerMensajePublicoError(
  err,
  mensajePredeterminado
) {
  if (
    err &&
    err.code === 'PAYPAL_AMOUNT_MISMATCH'
  ) {
    return 'El valor confirmado por PayPal no coincide con el plan.';
  }

  if (
    err &&
    err.code === 'PAYPAL_CURRENCY_MISMATCH'
  ) {
    return 'La moneda confirmada por PayPal no coincide con el pago.';
  }

  if (
    err &&
    err.code === 'PAYPAL_PAYMENT_NOT_FOUND'
  ) {
    return 'No se encontró el pago local asociado con PayPal.';
  }

  return mensajePredeterminado;
}

// =============================================
// CONTROLADOR
// =============================================

module.exports = {

  // ===========================================
  // CREAR PAGO
  // ===========================================

  crear: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const metodo =
        normalizarTexto(
          req.body.metodo || 'manual'
        ).toLowerCase();

      const plan =
        normalizarTexto(
          req.body.plan || 'pro'
        ).toLowerCase();

      const resultado =
        await PagoService.crearPago({
          usuario: usuarioId,
          metodo,
          plan
        });

      if (
        !resultado ||
        !resultado.pago ||
        !resultado.pago.id
      ) {
        throw new Error(
          'PagoService no devolvió un pago válido.'
        );
      }

      if (!resultado.url) {
        throw new Error(
          'PagoService no devolvió la URL del checkout.'
        );
      }

      sails.log.info(
        '💳 IA DemoFlow: Pago creado.',
        {
          pago: resultado.pago.id,
          usuario: usuarioId,
          metodo,
          plan,
          referencia:
            resultado.pago.referencia ||
            null
        }
      );

      return res.redirect(
        resultado.url
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error creando pago.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        err.message ||
        'Error registrando el pago.'
      );
    }
  },

  // ===========================================
  // CHECKOUT WOMPI
  // ===========================================

  wompi: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(req.params.id);

      if (
        !Number.isSafeInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.badRequest(
          'Identificador de pago inválido.'
        );
      }

      const pago = await Pago.findOne({
        id: pagoId,
        usuario: usuarioId
      });

      if (!pago) {
        return res.notFound(
          'Pago no encontrado.'
        );
      }

      if (pago.metodo !== 'wompi') {
        return res.badRequest(
          'Este pago no fue creado con Wompi.'
        );
      }

      if (pago.estado === 'aprobado') {
        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              wompi: 'aprobado'
            }
          )
        );
      }

      if (pago.estado === 'rechazado') {
        return res.badRequest(
          'Este pago fue rechazado. Debes crear uno nuevo.'
        );
      }

      const usuario =
        await Usuario.findOne({
          id: usuarioId
        });

      if (!usuario) {
        return res.redirect('/login');
      }

      const checkout =
        await WompiService.prepararCheckout(
          pago,
          usuario
        );

      sails.log.info(
        '🟣 IA DemoFlow: Checkout Wompi preparado.',
        {
          pago: pago.id,
          referencia: pago.referencia,
          usuario: usuario.id
        }
      );

      return res.view(
        'pages/pago/wompi',
        {
          titulo:
            'Pago seguro con Wompi',
          pago,
          checkout,
          usuario
        }
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error preparando Wompi.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        err.message ||
        'No fue posible preparar el pago con Wompi.'
      );
    }
  },

  // ===========================================
  // RESULTADO WOMPI
  // ===========================================

  resultadoWompi: async function (req, res) {
    try {
      const transaccionId =
        normalizarTexto(
          req.query.id ||
          req.query.transaction_id ||
          req.query.transactionId ||
          ''
        );

      if (!transaccionId) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Retorno Wompi sin ID de transacción.'
        );

        return res.redirect(
          '/pagos?wompi=error'
        );
      }

      const consulta =
        await WompiService
          .consultarTransaccion(
            transaccionId
          );

      const transaccion =
        consulta &&
        consulta.transaccion
          ? consulta.transaccion
          : {};

      const referencia =
        normalizarTexto(
          transaccion.reference || ''
        );

      let pago = null;

      if (referencia) {
        pago = await Pago.findOne({
          referencia
        });
      }

      const usuarioId =
        obtenerUsuarioSesion(req);

      if (
        pago &&
        usuarioId &&
        !pagoPerteneceAlUsuario(
          pago,
          usuarioId
        )
      ) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Usuario intentó consultar un pago Wompi ajeno.',
          {
            usuario: usuarioId,
            pago: pago.id,
            referencia
          }
        );

        return res.forbidden();
      }

      const estadoWompi =
        normalizarEstado(
          transaccion.status ||
          'PENDING'
        );

      const estadoDemoFlow =
        WebhookService
          .normalizarEstadoWompi(
            estadoWompi
          );

      sails.log.info(
        '🟣 IA DemoFlow: Usuario regresó de Wompi.',
        {
          transaccion:
            transaccionId,
          referencia,
          estadoWompi,
          estadoDemoFlow,
          pago:
            pago ? pago.id : null
        }
      );

      /*
       * El retorno solamente informa.
       * La aprobación definitiva la realiza
       * el webhook verificado de Wompi.
       */

      if (pago) {
        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              wompi:
                estadoDemoFlow,
              transaction_id:
                transaccionId
            }
          )
        );
      }

      return res.redirect(
        `/pagos?wompi=${encodeURIComponent(
          estadoDemoFlow
        )}`
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error consultando resultado Wompi.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.redirect(
        '/pagos?wompi=error'
      );
    }
  },

  // ===========================================
  // CHECKOUT PAYPAL
  // ===========================================

  paypal: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(req.params.id);

      if (
        !Number.isSafeInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.badRequest(
          'Identificador de pago inválido.'
        );
      }

      const pago = await Pago.findOne({
        id: pagoId,
        usuario: usuarioId
      });

      if (!pago) {
        return res.notFound(
          'Pago no encontrado.'
        );
      }

      if (pago.metodo !== 'paypal') {
        return res.badRequest(
          'Este pago no fue creado con PayPal.'
        );
      }

      if (pago.estado === 'aprobado') {
        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              paypal: 'aprobado'
            }
          )
        );
      }

      if (pago.estado === 'rechazado') {
        return res.badRequest(
          'Este pago fue rechazado. Debes crear uno nuevo.'
        );
      }

      const usuario =
        await Usuario.findOne({
          id: usuarioId
        });

      if (!usuario) {
        return res.redirect('/login');
      }

      /*
       * PaypalService debe reutilizar una orden
       * pendiente válida cuando ya exista.
       * Esto evita crear órdenes repetidas.
       */
      const resultadoPaypal =
        await PaypalService.crearOrden(
          pago
        );

      if (
        !resultadoPaypal ||
        !resultadoPaypal.ordenId
      ) {
        throw new Error(
          'PayPal no devolvió un identificador de orden.'
        );
      }

      const configuracion =
        PaypalService
          .obtenerConfiguracion();

      sails.log.info(
        '🟡 IA DemoFlow: Orden PayPal preparada.',
        {
          pago: pago.id,
          referencia:
            pago.referencia,
          ordenId:
            resultadoPaypal.ordenId,
          usuario: usuario.id,
          ambiente:
            configuracion.environment
        }
      );

      return res.view(
        'pages/pago/paypal',
        {
          titulo:
            'Pago seguro con PayPal',

          pago,

          paypal: {
            ...resultadoPaypal,

            ambiente:
              configuracion.environment,

            sandbox:
              configuracion.sandbox
          },

          usuario
        }
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error preparando PayPal.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        err.message ||
        'No fue posible preparar el pago con PayPal.'
      );
    }
  },

  // ===========================================
  // RETORNO PAYPAL
  // ===========================================

  retornoPaypal: async function (req, res) {
    let pagoEncontrado = null;

    try {
      const ordenId =
        normalizarTexto(
          req.query.token ||
          req.query.order_id ||
          req.query.orderId ||
          ''
        );

      if (!ordenId) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Retorno PayPal sin ID de orden.'
        );

        return res.redirect(
          '/pagos?paypal=error'
        );
      }

      /*
       * Captura realizada exclusivamente desde
       * el servidor de DemoFlowApp.
       *
       * PaypalService.capturarOrden debe ser
       * idempotente: si la orden ya fue capturada,
       * debe consultar y devolver la captura existente.
       */
      const capturaResultado =
        await PaypalService
          .capturarOrden(
            ordenId
          );

      if (
        !capturaResultado ||
        !capturaResultado.orden
      ) {
        throw new Error(
          'PayPal no devolvió los datos de la orden.'
        );
      }

      const orden =
        capturaResultado.orden;

      const unidad =
        obtenerUnidadCompraPaypal(
          orden
        );

      if (!unidad) {
        throw new Error(
          'La orden PayPal no contiene una unidad de compra.'
        );
      }

      const referencia =
        obtenerReferenciaPaypal(
          unidad
        );

      const pagoIdPersonalizado =
        obtenerPagoIdPaypal(
          unidad
        );

      const pago =
        await buscarPagoPaypal(
          pagoIdPersonalizado,
          referencia
        );

      pagoEncontrado = pago;

      if (!pago) {
        const error = new Error(
          'PayPal capturó una orden sin pago local asociado.'
        );

        error.code =
          'PAYPAL_PAYMENT_NOT_FOUND';

        sails.log.error(
          '❌ IA DemoFlow: Orden PayPal sin pago local asociado.',
          {
            ordenId,
            referencia,
            pagoIdPersonalizado
          }
        );

        throw error;
      }

      if (pago.metodo !== 'paypal') {
        sails.log.error(
          '❌ IA DemoFlow: Orden PayPal asociada con otro método.',
          {
            ordenId,
            pago: pago.id,
            metodo: pago.metodo
          }
        );

        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              paypal:
                'metodo-invalido'
            }
          )
        );
      }

      /*
       * Validación cruzada:
       * custom_id y referencia deben apuntar
       * al mismo pago local.
       */
      if (
        pagoIdPersonalizado &&
        Number(pago.id) !==
          Number(pagoIdPersonalizado)
      ) {
        throw new Error(
          'El identificador local del pago no coincide con la orden PayPal.'
        );
      }

      if (
        referencia &&
        pago.referencia &&
        normalizarTexto(
          pago.referencia
        ) !== referencia
      ) {
        throw new Error(
          'La referencia PayPal no coincide con el pago local.'
        );
      }

      const usuarioId =
        obtenerUsuarioSesion(req);

      /*
       * Si existe una sesión activa, el pago
       * debe pertenecer al usuario conectado.
       *
       * El webhook no debe depender de sesión,
       * pero este retorno del navegador sí puede
       * protegerse con la sesión disponible.
       */
      if (
        usuarioId &&
        !pagoPerteneceAlUsuario(
          pago,
          usuarioId
        )
      ) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Retorno PayPal asociado con otro usuario.',
          {
            ordenId,
            pago: pago.id,
            usuarioSesion:
              usuarioId,
            usuarioPago:
              pago.usuario
          }
        );

        return res.forbidden();
      }

      /*
       * Protección idempotente.
       *
       * Si el pago local ya fue aprobado,
       * no se vuelven a asignar Premium,
       * suscripción ni créditos IA.
       */
      if (pago.estado === 'aprobado') {
        sails.log.info(
          'ℹ️ IA DemoFlow: Pago PayPal ya estaba aprobado.',
          {
            pago: pago.id,
            ordenId
          }
        );

        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              paypal: 'aprobado',
              order_id: ordenId
            }
          )
        );
      }

      const captura =
        capturaResultado.captura ||
        PaypalService.extraerCaptura(
          orden
        );

      const estadoOrden =
        normalizarEstado(
          capturaResultado.estado ||
          orden.status ||
          ''
        );

      const estadoCaptura =
        normalizarEstado(
          captura &&
          captura.status
            ? captura.status
            : ''
        );

      const completado =
        estadoOrden === 'COMPLETED' ||
        estadoCaptura === 'COMPLETED';

      if (!completado) {
        sails.log.warn(
          '⚠️ IA DemoFlow: Orden PayPal todavía no completada.',
          {
            ordenId,
            pago: pago.id,
            estadoOrden,
            estadoCaptura
          }
        );

        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              paypal: 'pendiente',
              order_id: ordenId
            }
          )
        );
      }

      // =======================================
      // VALIDACIÓN MONETARIA
      // =======================================

      const datosEsperados =
        PaypalService
          .obtenerDatosMonetarios(
            pago
          );

      if (!datosEsperados) {
        throw new Error(
          'No fue posible determinar el precio esperado del pago.'
        );
      }

      const monedaEsperada =
        PaypalService
          .normalizarMoneda(
            datosEsperados.moneda
          );

      const valorEsperado =
        PaypalService
          .formatearValor(
            datosEsperados.valor,
            monedaEsperada
          );

      const montoCapturado =
        obtenerMontoPaypal(
          captura,
          unidad
        );

      if (!montoCapturado) {
        throw new Error(
          'PayPal no devolvió el monto de la captura.'
        );
      }

      const monedaRecibida =
        normalizarEstado(
          montoCapturado.currency_code ||
          ''
        );

      const valorRecibido =
        Number(
          montoCapturado.value
        );

      if (
        monedaRecibida !==
        monedaEsperada
      ) {
        const error = new Error(
          'La moneda confirmada por PayPal no coincide con el pago.'
        );

        error.code =
          'PAYPAL_CURRENCY_MISMATCH';

        sails.log.error(
          '❌ IA DemoFlow: Moneda PayPal inválida.',
          {
            pago: pago.id,
            ordenId,
            monedaEsperada,
            monedaRecibida
          }
        );

        throw error;
      }

      if (
        !importesCoinciden(
          valorRecibido,
          valorEsperado
        )
      ) {
        const error = new Error(
          'El valor confirmado por PayPal no coincide con el plan.'
        );

        error.code =
          'PAYPAL_AMOUNT_MISMATCH';

        sails.log.error(
          '❌ IA DemoFlow: Valor PayPal inválido.',
          {
            pago: pago.id,
            ordenId,
            valorEsperado,
            valorRecibido,
            monedaRecibida
          }
        );

        throw error;
      }

      // =======================================
      // INFORMACIÓN DE AUDITORÍA
      // =======================================

      const pagador =
        obtenerPagadorPaypal(
          orden
        );

      const capturaId =
        captura && captura.id
          ? normalizarTexto(
              captura.id
            )
          : null;

      const fechaCaptura =
        captura &&
        captura.create_time
          ? captura.create_time
          : (
              captura &&
              captura.update_time
                ? captura.update_time
                : null
            );

      const metadataPaypal = {
        proveedor: 'paypal',

        ordenId,

        capturaId,

        estadoOrden,

        estadoCaptura,

        referencia:
          pago.referencia,

        valor:
          Number(
            valorRecibido.toFixed(2)
          ),

        moneda:
          monedaRecibida,

        payerId:
          pagador.payerId,

        payerEmail:
          pagador.email,

        payerNombre:
          pagador.nombre,

        payerPais:
          pagador.pais,

        fechaCaptura,

        ip:
          req.ip ||
          req.headers[
            'x-forwarded-for'
          ] ||
          null,

        userAgent:
          req.headers[
            'user-agent'
          ] ||
          null
      };

      /*
       * PagoService.aprobarPago debe realizar
       * toda la operación en forma idempotente:
       *
       * 1. Aprobar el pago.
       * 2. Registrar transacción.
       * 3. Crear o activar suscripción.
       * 4. Convertir usuario en Premium.
       * 5. Asignar créditos IA.
       * 6. Evitar duplicados.
       *
       * El segundo argumento puede utilizarse
       * para almacenar los datos PayPal.
       */
      const resultadoPago =
        await PagoService.aprobarPago(
          pago.id,
          metadataPaypal
        );

      if (
        !resultadoPago ||
        !resultadoPago.pago
      ) {
        throw new Error(
          'PagoService no devolvió el pago aprobado.'
        );
      }

      sails.log.info(
        '✅ IA DemoFlow: Pago PayPal capturado y aprobado.',
        {
          pago: pago.id,
          usuario: pago.usuario,
          referencia:
            pago.referencia,
          ordenId,
          capturaId,
          valor:
            valorRecibido,
          moneda:
            monedaRecibida,
          payerId:
            pagador.payerId,
          payerEmail:
            pagador.email
        }
      );

      return res.redirect(
        construirUrlPago(
          resultadoPago.pago.id,
          {
            paypal: 'aprobado',
            order_id: ordenId
          }
        )
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error procesando retorno PayPal.',
        {
          mensaje: err.message,
          codigo: err.code || null,
          pago:
            pagoEncontrado
              ? pagoEncontrado.id
              : null,
          stack: err.stack
        }
      );

      const mensaje =
        obtenerMensajePublicoError(
          err,
          'No fue posible confirmar el pago PayPal.'
        );

      if (
        pagoEncontrado &&
        pagoEncontrado.id
      ) {
        return res.redirect(
          construirUrlPago(
            pagoEncontrado.id,
            {
              paypal: 'error',
              mensaje
            }
          )
        );
      }

      return res.redirect(
        `/pagos?paypal=error&mensaje=${encodeURIComponent(
          mensaje
        )}`
      );
    }
  },

  // ===========================================
  // CANCELACIÓN PAYPAL
  // ===========================================

  cancelarPaypal: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(
          req.query.pago ||
          req.query.pago_id ||
          req.query.payment_id ||
          0
        );

      const ordenId =
        normalizarTexto(
          req.query.token ||
          req.query.order_id ||
          ''
        );

      let pago = null;

      if (
        Number.isSafeInteger(pagoId) &&
        pagoId > 0
      ) {
        pago = await Pago.findOne({
          id: pagoId,
          usuario: usuarioId
        });
      }

      sails.log.info(
        'ℹ️ IA DemoFlow: Usuario canceló checkout PayPal.',
        {
          usuario: usuarioId,
          pago:
            pago ? pago.id : null,
          ordenId:
            ordenId || null
        }
      );

      /*
       * No se marca automáticamente como rechazado.
       * El usuario puede haber cerrado PayPal por error
       * y volver a intentar posteriormente.
       */
      if (pago) {
        return res.redirect(
          construirUrlPago(
            pago.id,
            {
              paypal: 'cancelado',
              order_id:
                ordenId || null
            }
          )
        );
      }

      return res.redirect(
        '/pagos?paypal=cancelado'
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error procesando cancelación PayPal.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.redirect(
        '/pagos?paypal=cancelado'
      );
    }
  },

  // ===========================================
  // APROBAR PAGO MANUALMENTE
  // ===========================================

  aprobar: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(req.params.id);

      if (
        !Number.isSafeInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.badRequest(
          'Identificador de pago inválido.'
        );
      }

      /*
       * Esta acción debe tener una policy
       * administrativa obligatoria.
       *
       * Ejemplo:
       * PagoController.aprobar: ['isAuthenticated', 'isAdmin']
       */

      const resultado =
        await PagoService.aprobarPago(
          pagoId,
          {
            proveedor: 'manual',
            aprobadoPor:
              usuarioId,
            ip:
              req.ip || null,
            userAgent:
              req.headers[
                'user-agent'
              ] || null
          }
        );

      sails.log.info(
        '✅ IA DemoFlow: Pago aprobado manualmente.',
        {
          pago:
            resultado.pago.id,
          administrador:
            usuarioId
        }
      );

      return res.redirect(
        construirUrlPago(
          resultado.pago.id,
          {
            estado: 'aprobado'
          }
        )
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error aprobando pago manualmente.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        err.message ||
        'No fue posible aprobar el pago.'
      );
    }
  },

  // ===========================================
  // RECHAZAR PAGO MANUALMENTE
  // ===========================================

  rechazar: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(req.params.id);

      if (
        !Number.isSafeInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.badRequest(
          'Identificador de pago inválido.'
        );
      }

      /*
       * Esta acción también debe tener una
       * policy administrativa obligatoria.
       */

      const resultado =
        await PagoService.rechazarPago(
          pagoId,
          {
            rechazadoPor:
              usuarioId,

            motivo:
              normalizarTexto(
                req.body.motivo ||
                'Rechazado manualmente'
              ),

            ip:
              req.ip || null
          }
        );

      sails.log.info(
        '❌ IA DemoFlow: Pago rechazado manualmente.',
        {
          pago:
            resultado.pago.id,
          administrador:
            usuarioId
        }
      );

      return res.redirect(
        construirUrlPago(
          resultado.pago.id,
          {
            estado: 'rechazado'
          }
        )
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error rechazando pago.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        err.message ||
        'No fue posible rechazar el pago.'
      );
    }
  },

  // ===========================================
  // VER PAGO
  // ===========================================

  ver: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagoId =
        Number(req.params.id);

      if (
        !Number.isSafeInteger(pagoId) ||
        pagoId <= 0
      ) {
        return res.badRequest(
          'Identificador de pago inválido.'
        );
      }

      const pago = await Pago.findOne({
        id: pagoId,
        usuario: usuarioId
      });

      if (!pago) {
        return res.notFound(
          'Pago no encontrado.'
        );
      }

      return res.view(
        'pages/pago/ver',
        {
          titulo:
            `Pago ${pago.referencia || pago.id}`,

          pago,

          mensajeWompi:
            req.query.wompi ||
            null,

          transaccionWompi:
            req.query.transaction_id ||
            null,

          mensajePaypal:
            req.query.paypal ||
            null,

          ordenPaypal:
            req.query.order_id ||
            null,

          mensajeEstado:
            req.query.estado ||
            null,

          mensajeError:
            req.query.mensaje ||
            null
        }
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error mostrando pago.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        'No fue posible mostrar el pago.'
      );
    }
  },

  // ===========================================
  // LISTAR PAGOS
  // ===========================================

  lista: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioSesion(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const pagos = await Pago.find({
        usuario: usuarioId
      }).sort(
        'createdAt DESC'
      );

      return res.view(
        'pages/pago/lista',
        {
          titulo: 'Mis pagos',

          pagos,

          mensajeWompi:
            req.query.wompi ||
            null,

          mensajePaypal:
            req.query.paypal ||
            null,

          mensajeEstado:
            req.query.estado ||
            null,

          mensajeError:
            req.query.mensaje ||
            null
        }
      );
    } catch (err) {
      sails.log.error(
        '❌ IA DemoFlow: Error listando pagos.',
        {
          mensaje: err.message,
          stack: err.stack
        }
      );

      return res.serverError(
        'No fue posible cargar los pagos.'
      );
    }
  }

};