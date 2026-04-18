module.exports = {
  tableName: 'proyectos',
  primaryKey: 'id',

  attributes: {

    id: {
      type: 'number',
      autoIncrement: true
    },

    nombre: {
      type: 'string',
      required: true,
      maxLength: 150
    },

    slug: {
      type: 'string',
      required: true,
      unique: true,
      maxLength: 180
    },

    descripcion: {
      type: 'string',
      allowNull: true
    },

    tipoProyecto: {
      type: 'string',
      columnName: 'tipo_proyecto',
      isIn: ['node', 'sails', 'html', 'externo'],
      defaultsTo: 'externo'
    },

    tecnologia: {
      type: 'string',
      allowNull: true,
      maxLength: 120
    },

    urlDemo: {
      type: 'string',
      columnName: 'url_demo',
      required: true
    },

    urlRepositorio: {
      type: 'string',
      columnName: 'url_repositorio',
      allowNull: true
    },

    archivoHtmlZip: {
      type: 'string',
      columnName: 'archivo_html_zip',
      allowNull: true
    },

    estado: {
      type: 'string',
      isIn: ['borrador', 'activo', 'vendido', 'pausado'],
      defaultsTo: 'borrador'
    },

    precioPropuesto: {
      type: 'string',
      columnName: 'precio_propuesto',
      defaultsTo: '0'
    },

    destacado: {
      type: 'boolean',
      defaultsTo: false
    },

    activo: {
      type: 'boolean',
      defaultsTo: true
    },

    usuario: {
      model: 'usuario',
      columnName: 'usuario_id'
    },

    cliente: {
      model: 'cliente',
      columnName: 'cliente_id'
    },

    createdAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoCreatedAt: false,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoUpdatedAt: false,
      columnName: 'updated_at'
    }

  }
};