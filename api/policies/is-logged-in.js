module.exports = async function (req, res, proceed) {
  try {

    // Si tienes sesión con userId
    if (req.session && req.session.userId) {
      return proceed();
    }

    // Si tienes sesión con objeto usuario
    if (req.session && req.session.usuario && req.session.usuario.id) {
      return proceed();
    }

    return res.redirect('/login');

  } catch (error) {
    sails.log.error('❌ Error en policy is-logged-in:', error);
    return res.serverError('Error verificando sesión');
  }
};