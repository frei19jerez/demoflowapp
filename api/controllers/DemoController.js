/**
 * DemoController
 * Maneja la apertura de demos dentro de DemoFlowApp
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  /**
   * /demo/:slug
   */
  ver: async function (req, res) {
    try {
      const slug = req.params.slug;

      if (!slug) {
        return res.badRequest('Slug no recibido');
      }

      const proyecto = await Proyecto.findOne({
        slug: slug,
        activo: true
      });

      if (!proyecto) {
        return res.notFound('No se encontró la demo');
      }

      const carpeta = proyecto.carpetaDemo || proyecto.slug;
      const rutaInterna = `/demos/${carpeta}/index.html`;

      const rutaFisica = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        carpeta,
        'index.html'
      );

      const tipo = proyecto.tipoProyecto || 'externo';

      // =========================
      // 🟢 1. HTML (ZIP)
      // =========================
      if (tipo === 'html') {
        if (fs.existsSync(rutaFisica)) {
          return res.redirect(rutaInterna);
        }

        if (proyecto.urlDemo) {
          return res.redirect(proyecto.urlDemo);
        }

        return res.notFound('No se encontró index.html del demo.');
      }

      // =========================
      // 🔵 2. NODE / SAILS
      // =========================
      if (tipo === 'node' || tipo === 'sails') {

        // 👉 si tiene puerto levantado
        if (proyecto.puerto) {
          return res.redirect(`http://localhost:${proyecto.puerto}`);
        }

        // 👉 si tiene URL manual (Render, etc)
        if (proyecto.urlDemo) {
          return res.redirect(proyecto.urlDemo);
        }

        // 👉 fallback elegante
        return res.redirect(`/proyecto/${proyecto.id}?estado=pendiente`);
      }

      // =========================
      // 🟡 3. EXTERNO / GIT
      // =========================
      if (proyecto.urlDemo) {

        const destino = proyecto.urlDemo.trim();

        // evitar bucles
        if (
          destino === `/demo/${slug}` ||
          destino === `/demo/${carpeta}`
        ) {
          if (fs.existsSync(rutaFisica)) {
            return res.redirect(rutaInterna);
          }
          return res.redirect(`/proyecto/${proyecto.id}`);
        }

        return res.redirect(destino);
      }

      // =========================
      // 🔴 4. FALLBACK
      // =========================
      if (fs.existsSync(rutaFisica)) {
        return res.redirect(rutaInterna);
      }

      return res.redirect(`/proyecto/${proyecto.id}`);

    } catch (error) {
      sails.log.error('================ ERROR DEMO VER ================');
      sails.log.error(error);
      sails.log.error('================================================');
      return res.serverError('Ocurrió un error cargando la demo');
    }
  },

  /**
   * /demo-check/:slug
   */
  check: async function (req, res) {
    try {
      const slug = req.params.slug;

      if (!slug) {
        return res.badRequest({
          ok: false,
          mensaje: 'Slug requerido'
        });
      }

      const proyecto = await Proyecto.findOne({ slug });

      if (!proyecto) {
        return res.json({
          ok: false,
          mensaje: 'Proyecto no encontrado'
        });
      }

      const carpeta = proyecto.carpetaDemo || proyecto.slug;

      const rutaFisica = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        carpeta,
        'index.html'
      );

      const existe = fs.existsSync(rutaFisica);

      return res.json({
        ok: true,
        nombre: proyecto.nombre,
        tipo: proyecto.tipoProyecto,
        carpeta,
        existe,
        urlDemo: proyecto.urlDemo,
        puerto: proyecto.puerto,
        ruta: `/demos/${carpeta}/index.html`
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