module.exports = async function (req, res, proceed) {
  try {
    // Si tienes sesión iniciada
    if (req.session && req.session.userId) {
      return proceed();
    }

    // Si no está autenticado
    return res.redirect('/login');
  } catch (error) {
    sails.log.error('Error en policy is-logged-in:', error);
    return res.serverError('Error verificando sesión');
  }
};