/**
 * isPremium.js
 * Política IA DemoFlow
 */

module.exports = async function(req, res, proceed) {

  // =========================
  // VALIDAR LOGIN
  // =========================

  if (!req.session.usuario) {

    return res.redirect('/login');
  }

  // =========================
  // VALIDAR PLAN
  // =========================

  const usuario = await Usuario.findOne({
    id: req.session.usuario.id
  });

  if (!usuario) {

    return res.redirect('/login');
  }

  // =========================
  // PLAN PREMIUM
  // =========================

  if (
    usuario.plan !== 'pro' &&
    usuario.plan !== 'empresa' &&
    usuario.rol !== 'admin'
  ) {

    return res.forbidden(
      '🚫 Esta función es Premium.'
    );
  }

  // =========================
  // CONTINUAR
  // =========================

  return proceed();

};