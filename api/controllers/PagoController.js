/**
 * PagoController.js
 * Controlador de pagos DemoFlow IA
 */

module.exports = {

  // =========================================
  // CREAR PAGO
  // =========================================

  crear: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      const metodo = req.body.metodo || 'manual';
      const plan = req.body.plan || 'pro';

      const resultado = await PagoService.crearPago({

        usuario: req.session.userId,
        metodo,
        plan

      });

      sails.log.info(
        '💳 IA DemoFlow: Pago creado:',
        resultado.pago.id
      );

      return res.redirect(resultado.url);

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error creando pago.'
      );

      sails.log.error(err);

      return res.serverError(
        'Error registrando pago.'
      );

    }

  },

  // =========================================
  // CHECKOUT WOMPI
  // =========================================

  wompi: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      const pago = await Pago.findOne({
        id: req.params.id,
        usuario: req.session.userId
      });

      if (!pago) {
        return res.notFound(
          'Pago no encontrado.'
        );
      }

      if (pago.estado === 'aprobado') {
        return res.redirect(
          `/pago/${pago.id}`
        );
      }

      if (pago.estado === 'rechazado') {
        return res.badRequest(
          'Este pago fue rechazado. Debes crear uno nuevo.'
        );
      }

      const usuario = await Usuario.findOne({
        id: req.session.userId
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
          titulo: 'Pago seguro con Wompi',
          pago,
          checkout,
          usuario
        }
      );

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error preparando Wompi.'
      );

      sails.log.error(err);

      return res.serverError(
        err.message ||
        'No fue posible preparar el pago con Wompi.'
      );

    }

  },

  // =========================================
  // RESULTADO WOMPI
  // =========================================

  resultadoWompi: async function (req, res) {

    try {

      /*
       * Wompi normalmente agrega el ID de la
       * transacción a la URL de retorno.
       */

      const transaccionId =
        req.query.id ||
        req.query.transaction_id ||
        req.query.transactionId ||
        null;

      if (!transaccionId) {

        sails.log.warn(
          '⚠️ IA DemoFlow: Retorno Wompi sin ID de transacción.'
        );

        return res.redirect('/pagos');

      }

      const consulta =
        await WompiService.consultarTransaccion(
          transaccionId
        );

      const transaccion =
        consulta.transaccion || {};

      const referencia = String(
        transaccion.reference || ''
      ).trim();

      let pago = null;

      if (referencia) {

        pago = await Pago.findOne({
          referencia
        });

      }

      /*
       * Evitar que un usuario autenticado consulte
       * accidentalmente el pago de otra persona.
       */

      if (
        pago &&
        req.session &&
        req.session.userId &&
        Number(pago.usuario) !==
          Number(req.session.userId)
      ) {

        sails.log.warn(
          '⚠️ IA DemoFlow: Usuario intentó consultar un pago ajeno.',
          {
            usuario: req.session.userId,
            pago: pago.id
          }
        );

        return res.forbidden();

      }

      const estadoWompi =
        String(
          transaccion.status || 'PENDING'
        ).toUpperCase();

      const estadoDemoFlow =
        WebhookService.normalizarEstadoWompi(
          estadoWompi
        );

      sails.log.info(
        '🟣 IA DemoFlow: Usuario regresó de Wompi.',
        {
          transaccion: transaccionId,
          referencia,
          estadoWompi,
          pago: pago ? pago.id : null
        }
      );

      /*
       * La redirección solamente informa.
       *
       * No se llama PagoService.aprobarPago() aquí.
       * La aprobación definitiva debe llegar mediante
       * el webhook firmado de Wompi.
       */

      if (pago) {

        return res.redirect(
          `/pago/${pago.id}` +
          `?wompi=${encodeURIComponent(estadoDemoFlow)}` +
          `&transaction_id=${encodeURIComponent(transaccionId)}`
        );

      }

      return res.redirect(
        `/pagos?wompi=${encodeURIComponent(estadoDemoFlow)}`
      );

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error consultando resultado Wompi.'
      );

      sails.log.error(err);

      return res.redirect(
        '/pagos?wompi=error'
      );

    }

  },

  // =========================================
  // APROBAR PAGO
  // =========================================

  aprobar: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      /*
       * Esta acción debe quedar reservada para
       * administradores cuando agreguemos la policy.
       */

      const resultado =
        await PagoService.aprobarPago(
          req.params.id
        );

      sails.log.info(
        '✅ IA DemoFlow: Pago aprobado manualmente:',
        resultado.pago.id
      );

      return res.redirect('/premium');

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error aprobando pago.'
      );

      sails.log.error(err);

      return res.serverError(
        'No fue posible aprobar el pago.'
      );

    }

  },

  // =========================================
  // RECHAZAR PAGO
  // =========================================

  rechazar: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      /*
       * Esta acción también debe quedar reservada
       * para administradores.
       */

      const resultado =
        await PagoService.rechazarPago(
          req.params.id
        );

      sails.log.info(
        '❌ IA DemoFlow: Pago rechazado manualmente:',
        resultado.pago.id
      );

      return res.redirect('/premium');

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error rechazando pago.'
      );

      sails.log.error(err);

      return res.serverError(
        'No fue posible rechazar el pago.'
      );

    }

  },

  // =========================================
  // VER PAGO
  // =========================================

  ver: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      const pago = await Pago.findOne({
        id: req.params.id,
        usuario: req.session.userId
      });

      if (!pago) {
        return res.notFound();
      }

      const mensajeWompi =
        req.query.wompi || null;

      const transaccionWompi =
        req.query.transaction_id || null;

      return res.view(
        'pages/pago/ver',
        {
          pago,
          mensajeWompi,
          transaccionWompi
        }
      );

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error mostrando pago.'
      );

      sails.log.error(err);

      return res.serverError();

    }

  },

  // =========================================
  // LISTAR PAGOS
  // =========================================

  lista: async function (req, res) {

    try {

      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      const pagos = await Pago.find({
        usuario: req.session.userId
      }).sort('createdAt DESC');

      return res.view(
        'pages/pago/lista',
        {
          pagos,
          mensajeWompi:
            req.query.wompi || null
        }
      );

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error listando pagos.'
      );

      sails.log.error(err);

      return res.serverError();

    }

  }

};