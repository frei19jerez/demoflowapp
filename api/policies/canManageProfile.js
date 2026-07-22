/**
 * canManageProfile.js
 * Permite que solo el propietario del perfil o un administrador
 * pueda administrarlo.
 */

'use strict';

module.exports = async function (req, res, proceed) {

    try {

        const usuarioId = req.session && req.session.userId;

        if (!usuarioId) {
            return res.redirect('/login');
        }

        // Administrador
        const usuario = await Usuario.findOne({
            id: usuarioId
        });

        if (!usuario) {
            return res.redirect('/login');
        }

        if (usuario.rol === 'admin' || usuario.esAdmin === true) {
            return proceed();
        }

        // Si viene un perfil por parámetro
        if (req.params.id) {

            const perfil = await Perfil.findOne({
                id: req.params.id
            });

            if (!perfil) {
                return res.notFound();
            }

            if (perfil.usuario === usuarioId) {
                return proceed();
            }

            return res.forbidden('No tienes permisos para administrar este perfil.');
        }

        return proceed();

    } catch (error) {

        sails.log.error(
            'Error en canManageProfile:',
            error
        );

        return res.serverError(error);

    }

};