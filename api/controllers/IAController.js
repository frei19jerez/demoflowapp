/**
 * IAController.js
 * IA interna de DemoFlow
 */

module.exports = {

  analizarProyecto: async function(req, res) {
    try {
      const {
        nombre,
        tipoProyecto,
        tecnologia,
        urlRepositorio,
        urlDemo,
        archivoEntrada,
        comandoInicio
      } = req.body;

      const texto = `
        ${nombre || ''}
        ${tipoProyecto || ''}
        ${tecnologia || ''}
        ${urlRepositorio || ''}
        ${urlDemo || ''}
        ${archivoEntrada || ''}
        ${comandoInicio || ''}
      `.toLowerCase();

      let tipoDetectado = 'externo';
      let comandoRecomendado = '';
      let archivoRecomendado = '';
      let mensaje = '🤖 IA DemoFlow: Proyecto analizado correctamente.';

      if (texto.includes('sails') || texto.includes('config/routes') || texto.includes('sails lift')) {
        tipoDetectado = 'sails';
        comandoRecomendado = 'node app.js';
        archivoRecomendado = 'app.js';
        mensaje = '🤖 IA DemoFlow: Detecté un proyecto Sails.js. Recomiendo iniciar con node app.js.';
      } else if (texto.includes('express') || texto.includes('server.js')) {
        tipoDetectado = 'node';
        comandoRecomendado = 'node server.js';
        archivoRecomendado = 'server.js';
        mensaje = '🤖 IA DemoFlow: Detecté un proyecto Node.js / Express.';
      } else if (texto.includes('app.js') || texto.includes('node')) {
        tipoDetectado = 'node';
        comandoRecomendado = 'node app.js';
        archivoRecomendado = 'app.js';
        mensaje = '🤖 IA DemoFlow: Detecté un proyecto Node.js.';
      } else if (texto.includes('react') || texto.includes('vite')) {
        tipoDetectado = 'node';
        comandoRecomendado = 'npm run build';
        archivoRecomendado = 'package.json';
        mensaje = '🤖 IA DemoFlow: Detecté un proyecto React/Vite.';
      } else if (texto.includes('index.html') || texto.includes('html')) {
        tipoDetectado = 'html';
        comandoRecomendado = '';
        archivoRecomendado = 'index.html';
        mensaje = '🤖 IA DemoFlow: Detecté una demo HTML estática.';
      } else if (urlDemo) {
        tipoDetectado = 'externo';
        comandoRecomendado = '';
        archivoRecomendado = '';
        mensaje = '🤖 IA DemoFlow: Detecté una demostración externa por URL.';
      }

      return res.json({
        ok: true,
        ia: true,
        tipoDetectado,
        comandoRecomendado,
        archivoRecomendado,
        mensaje
      });

    } catch (err) {
      sails.log.error('❌ IA DemoFlow: Error analizando proyecto');
      sails.log.error(err);

      return res.status(500).json({
        ok: false,
        mensaje: 'IA DemoFlow no pudo analizar el proyecto.'
      });
    }
  },

  sugerirDescripcion: async function(req, res) {
    try {
      const {
        nombre,
        tipoProyecto,
        tecnologia
      } = req.body;

      let descripcion = `Proyecto ${nombre || 'web'} desarrollado con ${tecnologia || 'tecnologías web'}, preparado para mostrarse como demo en vivo dentro de DemoFlow.`;

      if ((tecnologia || '').toLowerCase().includes('sails')) {
        descripcion = 'Aplicación web desarrollada en Sails.js y Node.js, preparada para ejecutarse como demo dinámica en DemoFlow con despliegue automático, runtime independiente y URL pública.';
      }

      if ((tecnologia || '').toLowerCase().includes('html')) {
        descripcion = 'Demo frontend desarrollada con HTML, CSS y JavaScript, optimizada para publicarse rápidamente en DemoFlow como proyecto estático responsive.';
      }

      return res.json({
        ok: true,
        descripcion
      });

    } catch (err) {
      return res.status(500).json({
        ok: false,
        descripcion: ''
      });
    }
  },

  analizarDashboard: async function(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({
        id: req.session.userId
      });

      if (!usuario) {
        return res.redirect('/login');
      }

      const proyectos = await Proyecto.find({
        usuario: usuario.id
      });

      const totalProyectos = proyectos.length;

      const demosConUrl = proyectos.filter(function(p) {
        return p.urlDemo;
      }).length;

      const proyectosSails = proyectos.filter(function(p) {
        return (p.tipoProyecto || '').toLowerCase() === 'sails';
      }).length;

      const proyectosHtml = proyectos.filter(function(p) {
        return (p.tipoProyecto || '').toLowerCase() === 'html';
      }).length;

      let recomendacion = 'Agrega más demos en vivo, screenshots y descripciones comerciales para aumentar conversiones.';
      let potencial = 'Tu perfil tiene potencial SaaS comercial.';
      let estado = 'IA activada correctamente.';

      if (totalProyectos === 0) {
        recomendacion = 'Crea tu primer proyecto demo para que DemoFlow IA pueda analizar tu portafolio.';
        potencial = 'Aún falta información para calcular el potencial comercial.';
      }

      if (demosConUrl >= 3) {
        recomendacion = 'Tu portafolio ya tiene varias demos visibles. El siguiente paso es mejorar textos de venta y llamados a la acción.';
        potencial = 'Alto potencial comercial para vender servicios o demos SaaS.';
      }

      await IAHistorial.create({
        usuario: usuario.id,
        proyecto: null,
        tipo: 'dashboard',
        resultado: {
          estado,
          recomendacion,
          potencial,
          totalProyectos,
          demosConUrl,
          proyectosSails,
          proyectosHtml
        },
        creditosUsados: 1
      });

      return res.view('pages/dashboard/index', {
        usuario,
        proyectos,
        iaDashboard: {
          estado,
          recomendacion,
          potencial,
          totalProyectos,
          demosConUrl,
          proyectosSails,
          proyectosHtml
        }
      });

    } catch (err) {
      sails.log.error('❌ Error analizando dashboard IA');
      sails.log.error(err);

      return res.serverError(err);
    }
  }

};