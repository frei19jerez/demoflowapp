const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

module.exports = {

  proxy: async function(req, res) {

    try {

      const slug = req.params.slug;

      if (!slug) {
        return res.badRequest('Slug requerido');
      }

      const proyecto = await Proyecto.findOne({
        slug: slug
      });

      if (!proyecto) {
        return res.notFound('Proyecto no encontrado');
      }

      if (!proyecto.puerto) {
        return res.serverError('El proyecto no tiene puerto asignado');
      }

      const target = `http://127.0.0.1:${proyecto.puerto}`;

      sails.log.info('🚀 Proxy runtime =>', target);

      proxy.web(req, res, {
        target,
        changeOrigin: true,
        ws: true
      });

    } catch (error) {

      sails.log.error('================ RUNTIME ERROR ================');
      sails.log.error(error);
      sails.log.error('================================================');

      return res.serverError('Error cargando runtime');

    }

  }

};