/**
 * PerfilController.js
 * Perfil público y administración privada del perfil.
 */

'use strict';

function obtenerUsuarioId(req) {
  const id =
    req &&
    req.session &&
    req.session.userId
      ? Number(req.session.userId)
      : null;

  return (
    Number.isSafeInteger(id) &&
    id > 0
  )
    ? id
    : null;
}

function limpiarProyectoPublico(proyecto) {
  return {
    id: proyecto.id,
    nombre:
      proyecto.nombre ||
      proyecto.slug ||
      `Proyecto ${proyecto.id}`,
    slug:
      proyecto.slug || null,
    descripcion:
      proyecto.descripcion || null,
    tecnologia:
      proyecto.tecnologia ||
      proyecto.tipoProyecto ||
      proyecto.tipo ||
      null,
    urlDemo:
      proyecto.urlDemo ||
      proyecto.url ||
      null,
    imagen:
      proyecto.imagen ||
      proyecto.screenshot ||
      proyecto.logo ||
      null,
    estado:
      proyecto.estado ||
      proyecto.estadoDeploy ||
      null
  };
}

module.exports = {

  // =========================================
  // MI PERFIL
  // =========================================

  miPerfil: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioId(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({
        id: usuarioId
      });

      if (!usuario) {
        return res.redirect('/login');
      }

      const perfil =
        await PerfilService
          .obtenerOCrearPorUsuario(usuario);

      return res.redirect(
        `/u/${perfil.slug}`
      );
    } catch (error) {
      sails.log.error(
        '❌ DemoFlow: Error abriendo mi perfil.',
        {
          mensaje: error.message,
          stack: error.stack
        }
      );

      return res.serverError(
        'No fue posible abrir el perfil.'
      );
    }
  },

  // =========================================
  // PERFIL PÚBLICO
  // =========================================

  publico: async function (req, res) {
    try {
      const slug =
        String(req.params.slug || '')
          .trim()
          .toLowerCase();

      if (!slug) {
        return res.notFound(
          'Perfil no encontrado.'
        );
      }

      let perfil = await Perfil.findOne({
        slug
      });

      if (
        !perfil ||
        perfil.publico === false
      ) {
        return res.notFound(
          'Perfil no encontrado.'
        );
      }

      const usuario = await Usuario.findOne({
        id: perfil.usuario
      });

      if (!usuario) {
        return res.notFound(
          'Usuario no encontrado.'
        );
      }

      const proyectosEncontrados =
        await Proyecto.find({
          usuario: usuario.id
        });

      const proyectos = proyectosEncontrados
        .filter((proyecto) => {
          if (proyecto.publico === false) {
            return false;
          }

          const estado = String(
            proyecto.estado || ''
          ).toLowerCase();

          return estado !== 'eliminado';
        })
        .map(limpiarProyectoPublico);

      perfil =
        await PerfilService
          .incrementarVisitas(perfil);

      const usuarioSesionId =
        obtenerUsuarioId(req);

      const esPropietario =
        usuarioSesionId === usuario.id;

      return res.view(
        'pages/perfil/publico',
        {
          titulo:
            `${perfil.nombrePublico || usuario.nombre || 'Perfil'} | DemoFlow`,
          perfil,
          propietario: usuario,
          proyectos,
          esPropietario,
          usuarioActual:
            usuarioSesionId
              ? await Usuario.findOne({
                  id: usuarioSesionId
                })
              : null
        }
      );
    } catch (error) {
      sails.log.error(
        '❌ DemoFlow: Error cargando perfil público.',
        {
          mensaje: error.message,
          stack: error.stack
        }
      );

      return res.serverError(
        'No fue posible cargar el perfil.'
      );
    }
  },

  // =========================================
  // EDITAR PERFIL
  // =========================================

  editar: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioId(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({
        id: usuarioId
      });

      if (!usuario) {
        return res.redirect('/login');
      }

      const perfil =
        await PerfilService
          .obtenerOCrearPorUsuario(usuario);

      return res.view(
        'pages/perfil/editar',
        {
          titulo:
            'Editar mi perfil | DemoFlow',
          usuario,
          perfil,
          mensaje:
            req.query.mensaje || null,
          error:
            req.query.error || null
        }
      );
    } catch (error) {
      sails.log.error(
        '❌ DemoFlow: Error cargando editor de perfil.',
        {
          mensaje: error.message,
          stack: error.stack
        }
      );

      return res.serverError(
        'No fue posible cargar el editor del perfil.'
      );
    }
  },

  // =========================================
  // ACTUALIZAR PERFIL
  // =========================================

  actualizar: async function (req, res) {
    try {
      const usuarioId =
        obtenerUsuarioId(req);

      if (!usuarioId) {
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({
        id: usuarioId
      });

      if (!usuario) {
        return res.redirect('/login');
      }

      const perfil =
        await PerfilService
          .obtenerOCrearPorUsuario(usuario);

      const actualizado =
        await PerfilService.actualizar({
          perfil,
          datos: req.body || {}
        });

      sails.log.info(
        '✅ DemoFlow: Perfil actualizado.',
        {
          usuario: usuario.id,
          perfil: actualizado.id,
          slug: actualizado.slug
        }
      );

      return res.redirect(
        `/u/${actualizado.slug}?perfil_actualizado=1`
      );
    } catch (error) {
      sails.log.error(
        '❌ DemoFlow: Error actualizando perfil.',
        {
          mensaje: error.message,
          stack: error.stack
        }
      );

      return res.redirect(
        `/perfil/editar?error=${encodeURIComponent(
          error.message ||
          'No fue posible actualizar el perfil.'
        )}`
      );
    }
  }

};