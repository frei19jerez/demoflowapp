/**
 * isOwner.js
 * Permite continuar únicamente al propietario del recurso
 * o a un administrador de DemoFlowApp.
 */

'use strict';

module.exports = async function isOwner(req, res, proceed) {
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
      if (req.session) {
        req.session.userId = null;
        req.session.usuarioId = null;
      }

      if (req.wantsJSON) {
        return res.status(401).json({
          ok: false,
          mensaje: 'La sesión no es válida.'
        });
      }

      return res.redirect('/login');
    }

    const esAdministrador =
      usuario.esAdmin === true ||
      usuario.admin === true ||
      String(usuario.rol || '').toLowerCase() === 'admin';

    if (esAdministrador) {
      return proceed();
    }

    const recursoId = Number(
      req.params.id ||
      req.params.proyectoId ||
      req.body.id ||
      req.body.proyectoId
    );

    /*
     * Algunas acciones privadas no reciben un ID en la URL.
     * En ese caso, la propiedad se valida dentro del controlador.
     */
    if (!Number.isSafeInteger(recursoId) || recursoId <= 0) {
      return proceed();
    }

    const proyecto = await Proyecto.findOne({
      id: recursoId
    });

    if (!proyecto) {
      if (req.wantsJSON) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Proyecto no encontrado.'
        });
      }

      return res.notFound('Proyecto no encontrado.');
    }

    const propietarioId = Number(
      proyecto.usuario ||
      proyecto.usuarioId ||
      proyecto.propietario
    );

    if (propietarioId === usuarioId) {
      return proceed();
    }

    if (req.wantsJSON) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permiso para administrar este recurso.'
      });
    }

    return res.forbidden(
      'No tienes permiso para administrar este recurso.'
    );
  } catch (error) {
    sails.log.error('❌ DemoFlow: Error en policy isOwner.', {
      mensaje: error.message,
      stack: error.stack
    });

    if (req.wantsJSON) {
      return res.status(500).json({
        ok: false,
        mensaje: 'No fue posible comprobar los permisos.'
      });
    }

    return res.serverError(
      'No fue posible comprobar los permisos.'
    );
  }
};