/**
 * isAdmin.js
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
  // VALIDAR ROL
  // =========================

  if (
    req.session.usuario.rol !== 'admin'
  ) {

    return res.forbidden(
      '🚫 Solo administradores.'
    );
  }

  // =========================
  // CONTINUAR
  // =========================

  return proceed();

};