module.exports = {

  async index(req, res) {
    try {
      const proyectos = await Proyecto.find();

      return res.view('pages/homepage', {
        proyectos
      });
    } catch (error) {
      sails.log.error('ERROR EN INDEX:', error);
      return res.serverError('Error cargando proyectos');
    }
  },

  nuevo(req, res) {
    return res.view('pages/nuevo');
  },

  async crear(req, res) {
    try {
      await Proyecto.create({
        nombre: req.body.nombre,
        descripcion: req.body.descripcion || null,
        tipoProyecto: req.body.tipoProyecto || 'externo',
        tecnologia: req.body.tecnologia || null,
        urlDemo: req.body.urlDemo,
        urlRepositorio: req.body.urlRepositorio || null,
        estado: 'borrador',
        precioPropuesto: 0,
        destacado: false,
        activo: true
      }).fetch();

      return res.redirect('/');
    } catch (error) {
      sails.log.error('ERROR AL CREAR:', error);
      return res.serverError('Error al crear proyecto');
    }
  },

  async ver(req, res) {
    try {
      const proyecto = await Proyecto.findOne({ id: req.params.id });

      if (!proyecto) {
        return res.notFound('Proyecto no encontrado');
      }

      return res.view('pages/ver', { proyecto });
    } catch (error) {
      sails.log.error('ERROR AL VER:', error);
      return res.serverError('Error al ver proyecto');
    }
  }

};
