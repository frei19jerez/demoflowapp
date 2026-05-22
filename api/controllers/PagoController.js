module.exports = {

  crear: async function(req, res) {
    try {
      if (!req.session || !req.session.userId) {
        return res.redirect('/login');
      }

      const metodo = req.body.metodo;
      const plan = req.body.plan || 'pro';

      let valor = 30000;

      if (plan === 'empresa') {
        valor = 80000;
      }

      const pago = await Pago.create({
        usuario: req.session.userId,
        metodo,
        plan,
        valor,
        estado: 'pendiente'
      }).fetch();

      sails.log.info('💳 IA DemoFlow: Pago registrado:', pago.id);

      return res.redirect('/premium');

    } catch (err) {
      sails.log.error('❌ Error creando pago');
      sails.log.error(err);
      return res.serverError('Error registrando pago.');
    }
  }

};