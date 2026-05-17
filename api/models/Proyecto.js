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
      allowNull: true,
      columnType: 'text'
    },

    tipoProyecto: {
      type: 'string',
      columnName: 'tipo_proyecto',
      isIn: ['externo', 'html', 'node', 'sails', 'git'],
      defaultsTo: 'externo'
    },

    tecnologia: {
      type: 'string',
      allowNull: true,
      maxLength: 150
    },

    urlDemo: {
      type: 'string',
      columnName: 'url_demo',
      allowNull: true,
      columnType: 'text'
    },

    urlRepositorio: {
      type: 'string',
      columnName: 'url_repositorio',
      allowNull: true,
      columnType: 'text'
    },

    archivoZipOriginal: {
      type: 'string',
      columnName: 'archivo_zip_original',
      allowNull: true,
      columnType: 'text'
    },

    carpetaDemo: {
      type: 'string',
      columnName: 'carpeta_demo',
      allowNull: true,
      maxLength: 180
    },

    carpetaRuntime: {
      type: 'string',
      columnName: 'carpeta_runtime',
      allowNull: true,
      columnType: 'text'
    },

    comandoInicio: {
      type: 'string',
      columnName: 'comando_inicio',
      allowNull: true,
      columnType: 'text'
    },

    archivoEntrada: {
      type: 'string',
      columnName: 'archivo_entrada',
      allowNull: true,
      maxLength: 180
    },

    puerto: {
      type: 'number',
      allowNull: true
    },

    deployType: {
      type: 'string',
      columnName: 'deploy_type',
      isIn: ['static', 'dynamic', 'external'],
      defaultsTo: 'external'
    },

    estadoDeploy: {
      type: 'string',
      columnName: 'estado_deploy',
      isIn: [
        'pendiente',
        'procesando',
        'subido',
        'instalando',
        'activo',
        'fallido',
        'detenido'
      ],
      defaultsTo: 'pendiente'
    },

    logDeploy: {
      type: 'string',
      columnName: 'log_deploy',
      allowNull: true,
      columnType: 'text'
    },

    // ✅ PostgreSQL numeric suele regresar como texto: '0.00'
    precioPropuesto: {
      type: 'string',
      columnName: 'precio_propuesto',
      defaultsTo: '0.00'
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
      autoCreatedAt: true,
      columnName: 'created_at'
    },

    updatedAt: {
      type: 'ref',
      columnType: 'timestamp',
      autoUpdatedAt: true,
      columnName: 'updated_at'
    }

  }
};