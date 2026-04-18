/**
 * DemoController
 *
 * Maneja la apertura de demos dentro de DemoFlowApp
 */

const path = require('path');
const fs = require('fs');

module.exports = {

  /**
   * /demo/:slug
   * Busca el proyecto por slug y redirige a su demo
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

      const rutaInterna = `/demos/${slug}/index.html`;

      // Si existe urlDemo guardada en base de datos
      if (proyecto.urlDemo && proyecto.urlDemo.trim() !== '') {
        const destino = proyecto.urlDemo.trim();

        // Evitar bucle si alguien guardó /demo/slug
        if (destino === `/demo/${slug}`) {
          return res.redirect(rutaInterna);
        }

        // Si es URL externa
        if (destino.startsWith('http://') || destino.startsWith('https://')) {
          return res.redirect(destino);
        }

        // Si ya es ruta interna válida
        return res.redirect(destino);
      }

      // Si no hay urlDemo, intenta abrir la ruta interna por defecto
      return res.redirect(rutaInterna);

    } catch (error) {
      sails.log.error('================ ERROR DEMO VER ================');
      sails.log.error(error);
      sails.log.error('================================================');
      return res.serverError('Ocurrió un error cargando la demo');
    }
  },

  /**
   * /demo-check/:slug
   * Verifica si una carpeta demo existe físicamente
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

      const rutaFisica = path.resolve(
        sails.config.appPath,
        'assets',
        'demos',
        slug,
        'index.html'
      );

      const existe = fs.existsSync(rutaFisica);

      return res.json({
        ok: true,
        slug: slug,
        existe: existe,
        ruta: `/demos/${slug}/index.html`,
        rutaFisica: rutaFisica
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