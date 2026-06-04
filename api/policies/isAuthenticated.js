/**
 * isAuthenticated.js
 * Política IA DemoFlow
 */

module.exports = async function (req, res, proceed) {
  try {

    if (req.session && req.session.userId) {
      return proceed();
    }

    if (req.session && req.session.usuario && req.session.usuario.id) {
      return proceed();
    }

    req.session.returnTo = req.originalUrl || req.url || '/dashboard';

    return req.session.save(function () {
      return res.redirect('/login');
    });

  } catch (error) {
    sails.log.error('❌ Error en policy isAuthenticated:', error);
    return res.serverError('Error verificando sesión');
  }
};