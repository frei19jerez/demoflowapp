/**
 * isAuthenticated.js
 * Permite continuar únicamente a usuarios autenticados.
 */

'use strict';

module.exports = async function (
  req,
  res,
  proceed
) {
  const usuarioId =
    req &&
    req.session &&
    req.session.userId
      ? Number(req.session.userId)
      : null;

  if (
    Number.isSafeInteger(usuarioId) &&
    usuarioId > 0
  ) {
    return proceed();
  }

  if (req.wantsJSON) {
    return res
      .status(401)
      .json({
        ok: false,
        mensaje:
          'Debes iniciar sesión.'
      });
  }

  return res.redirect('/login');
};