/**
 * DemoController
 * 🚀 DemoFlow IA
 * Maneja apertura inteligente de demos HTML, Node.js, Sails y externos
 */

const path = require('path');
const fs = require('fs');

function existe(ruta) {
  try {
    return fs.existsSync(ruta);
  } catch (e) {
    return false;
  }
}

function limpiarSlug(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '');
}

function detectarIndexAutomatico(carpetaBase) {

  if (!existe(carpetaBase)) {
    return null;
  }

  const indexDirecto = path.join(carpetaBase, 'index.html');

  if (existe(indexDirecto)) {
    return indexDirecto;
  }

  const items = fs.readdirSync(carpetaBase, {
    withFileTypes: true
  });

  for (const item of items) {

    if (!item.isDirectory()) {
      continue;
    }

    const posible = path.join(
      carpetaBase,
      item.name,
      'index.html'
    );

    if (existe(posible)) {
      return posible;
    }
  }

  return null;
}

module.exports = {

  /**
   * /demo/:slug
   */
  ver: async function (req, res) {

    try {

      const slug = limpiarSlug(req.params.slug);

      if (!slug) {
        return res.badRequest('Slug no recibido');
      }

      const proyecto = await Proyecto.findOne({
        slug,
        activo: true
      });

      if (!proyecto) {
        return res.notFound('No se encontró la demo');
      }

      const carpeta = proyecto.carpetaDemo || proyecto.slug;

      const carpetaBase = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        carpeta
      );

      const indexDetectado = detectarIndexAutomatico(carpetaBase);

      let rutaInterna = `/demos/${carpeta}/index.html`;

      // 🤖 IA detecta subcarpeta automática
      if (indexDetectado) {

        const relativa = path.relative(
          path.resolve(
            sails.config.appPath,
            'assets'
          ),
          indexDetectado
        );

        rutaInterna = '/' + relativa.replace(/\\/g, '/');
      }

      const tipo = proyecto.tipoProyecto || 'externo';

      sails.log.info('🤖 DEMOFLOW IA');
      sails.log.info('Proyecto:', proyecto.nombre);
      sails.log.info('Tipo:', tipo);
      sails.log.info('Ruta detectada:', rutaInterna);

      // ==================================================
      // 🟢 HTML
      // ==================================================

      if (tipo === 'html') {

        if (indexDetectado) {

          sails.log.info('✅ HTML detectado correctamente');

          return res.redirect(rutaInterna);
        }

        if (proyecto.urlDemo) {

          sails.log.warn('⚠ HTML sin index local, usando URL');

          return res.redirect(proyecto.urlDemo);
        }

        sails.log.error('❌ No existe index.html');

        return res.notFound(
          'No se encontró index.html del proyecto HTML.'
        );
      }

      // ==================================================
      // 🔵 NODE / SAILS
      // ==================================================

      if (
        tipo === 'node' ||
        tipo === 'sails'
      ) {

        // 🧠 IA detecta runtime activo

        if (proyecto.puerto) {

          const urlLocal = `http://localhost:${proyecto.puerto}`;

          sails.log.info('🚀 Runtime detectado:', urlLocal);

          return res.redirect(urlLocal);
        }

        // 🌎 URL manual

        if (proyecto.urlDemo) {

          sails.log.info('🌎 URL externa runtime:', proyecto.urlDemo);

          return res.redirect(proyecto.urlDemo);
        }

        sails.log.warn('⚠ Proyecto backend pendiente');

        return res.redirect(
          `/proyecto/${proyecto.id}?estado=pendiente`
        );
      }

      // ==================================================
      // 🟡 EXTERNOS
      // ==================================================

      if (proyecto.urlDemo) {

        const destino = proyecto.urlDemo.trim();

        if (
          destino === `/demo/${slug}` ||
          destino === `/demo/${carpeta}`
        ) {

          sails.log.warn('⚠ Evitando bucle de redirección');

          if (indexDetectado) {
            return res.redirect(rutaInterna);
          }

          return res.redirect(`/proyecto/${proyecto.id}`);
        }

        sails.log.info('🌎 Redirección externa:', destino);

        return res.redirect(destino);
      }

      // ==================================================
      // 🔴 FALLBACK IA
      // ==================================================

      if (indexDetectado) {

        sails.log.info('🤖 Fallback IA HTML');

        return res.redirect(rutaInterna);
      }

      sails.log.warn('⚠ Sin demo válida');

      return res.redirect(`/proyecto/${proyecto.id}`);

    } catch (error) {

      sails.log.error('================ ERROR DEMO VER ================');
      sails.log.error(error);
      sails.log.error('================================================');

      return res.serverError(
        'Ocurrió un error cargando la demo'
      );
    }
  },

  /**
   * /demo-check/:slug
   */
  check: async function (req, res) {

    try {

      const slug = limpiarSlug(req.params.slug);

      if (!slug) {

        return res.badRequest({
          ok: false,
          mensaje: 'Slug requerido'
        });
      }

      const proyecto = await Proyecto.findOne({
        slug
      });

      if (!proyecto) {

        return res.json({
          ok: false,
          mensaje: 'Proyecto no encontrado'
        });
      }

      const carpeta = proyecto.carpetaDemo || proyecto.slug;

      const carpetaBase = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        carpeta
      );

      const indexDetectado = detectarIndexAutomatico(carpetaBase);

      let rutaFinal = null;

      if (indexDetectado) {

        rutaFinal =
          '/' +
          path.relative(
            path.resolve(
              sails.config.appPath,
              'assets'
            ),
            indexDetectado
          ).replace(/\\/g, '/');
      }

      return res.json({

        ok: true,

        ia: {
          demoDetectada: !!indexDetectado,
          tecnologia: proyecto.tipoProyecto,
          runtimeActivo: !!proyecto.puerto
        },

        nombre: proyecto.nombre,

        tipo: proyecto.tipoProyecto,

        carpeta,

        existe: !!indexDetectado,

        urlDemo: proyecto.urlDemo,

        puerto: proyecto.puerto,

        ruta: rutaFinal ||

          `/demos/${carpeta}/index.html`
      });

    } catch (error) {

      sails.log.error('================ ERROR DEMO CHECK ================');
      sails.log.error(error);
      sails.log.error('==================================================');

      return res.serverError({
        ok: false,
        mensaje: 'Error verificando demo'
      });
    }
  }

};