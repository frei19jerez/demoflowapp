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

      sails.log.info('💳 IA DemoFlow: Pago creado:', resultado.pago.id);

      return res.redirect(resultado.url);

    } catch (err) {

      sails.log.error('❌ Error creando pago');
      sails.log.error(err);

      return res.serverError('Error registrando pago.');

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

      const resultado = await PagoService.aprobarPago(
        req.params.id
      );

      sails.log.info('✅ Pago aprobado:', resultado.pago.id);

      return res.redirect('/premium');

    } catch (err) {

      sails.log.error(err);

      return res.serverError('No fue posible aprobar el pago.');

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

      const resultado = await PagoService.rechazarPago(
        req.params.id
      );

      sails.log.info('❌ Pago rechazado:', resultado.pago.id);

      return res.redirect('/premium');

    } catch (err) {

      sails.log.error(err);

      return res.serverError('No fue posible rechazar el pago.');

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
        id: req.params.id
      });

      if (!pago) {
        return res.notFound();
      }

      return res.view('pages/pago/ver', {
        pago
      });

    } catch (err) {

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

      return res.view('pages/pago/lista', {
        pagos
      });

    } catch (err) {

      sails.log.error(err);

      return res.serverError();

    }

  }

};