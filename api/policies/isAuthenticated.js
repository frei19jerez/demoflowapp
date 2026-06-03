/**
 * isAuthenticated.js
 * Política IA DemoFlow
 */

module.exports = async function(req, res, proceed) {

  // =========================
  // VALIDAR SESIÓN
  // =========================

  if (!req.session || !req.session.userId) {

    req.session.returnTo = req.originalUrl || req.url || '/dashboard';

    return req.session.save(function() {
      return res.redirect('/login');
    });
  }

  // =========================
  // USUARIO AUTENTICADO
  // =========================

  return proceed();

};