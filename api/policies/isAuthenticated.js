/**
 * isAuthenticated.js
 * Política IA DemoFlow
 */

module.exports = async function(req, res, proceed) {

  // =========================
  // VALIDAR SESIÓN
  // =========================

  if (!req.session.usuario) {

    return res.redirect('/login');
  }

  // =========================
  // USUARIO AUTENTICADO
  // =========================

  return proceed();

};