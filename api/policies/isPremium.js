/**
 * isPremium.js
 * Permite continuar a usuarios Premium o administradores.
 */

'use strict';

module.exports = async function isPremium(req, res, proceed) {
  try {
    const usuarioId = Number(
      req.session &&
      (
        req.session.userId ||
        req.session.usuarioId
      )
    );

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      if (req.wantsJSON) {
        return res.status(401).json({
          ok: false,
          mensaje: 'Debes iniciar sesión.'
        });
      }

      return res.redirect('/login');
    }

    const usuario = await Usuario.findOne({
      id: usuarioId
    });

    if (!usuario) {
      return res.redirect('/login');
    }

    const esAdministrador =
      usuario.esAdmin === true ||
      usuario.admin === true ||
      String(usuario.rol || '').toLowerCase() === 'admin';

    const esPremium =
      usuario.premium === true ||
      usuario.esPremium === true ||
      String(usuario.plan || '').toLowerCase() === 'premium' ||
      String(usuario.plan || '').toLowerCase() === 'pro' ||
      String(usuario.plan || '').toLowerCase() === 'empresa';

    if (esAdministrador || esPremium) {
      return proceed();
    }

    if (req.wantsJSON) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Esta función requiere un plan Premium.'
      });
    }

    return res.redirect('/planes?premium_requerido=1');
  } catch (error) {
    sails.log.error('❌ DemoFlow: Error en policy isPremium.', {
      mensaje: error.message,
      stack: error.stack
    });

    return res.serverError(
      'No fue posible comprobar el plan del usuario.'
    );
  }
};