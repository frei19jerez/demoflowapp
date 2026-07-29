const { Client } = require('pg');
const crypto = require('crypto');

module.exports = {

  /**
   * Convierte cualquier texto en un nombre seguro para PostgreSQL.
   *
   * PostgreSQL permite identificadores de hasta 63 caracteres.
   * Aquí usamos un máximo menor para dejar espacio al prefijo y al ID.
   */
  normalizarNombre(nombre = '', limite = 40) {
    const limiteSeguro =
      Number.isInteger(limite) && limite > 0
        ? Math.min(limite, 63)
        : 40;

    const limpio = String(nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .substring(0, limiteSeguro)
      .replace(/_+$/g, '');

    return limpio || 'proyecto';
  },

  /**
   * Genera un nombre único para la base de datos.
   *
   * Ejemplo:
   * df_mi_proyecto_25
   */
  generarNombreBase(proyecto) {
    if (!proyecto || !proyecto.id) {
      throw new Error(
        'Se necesita un proyecto guardado con identificador para generar la base.'
      );
    }

    const proyectoId =
      this.normalizarNombre(
        String(proyecto.id),
        15
      );

    const prefijo = 'df_';
    const separador = '_';

    const espacioDisponible =
      63 -
      prefijo.length -
      separador.length -
      proyectoId.length;

    const nombreProyecto =
      this.normalizarNombre(
        proyecto.slug ||
        proyecto.nombre ||
        `proyecto_${proyecto.id}`,
        Math.max(10, espacioDisponible)
      );

    return `${prefijo}${nombreProyecto}${separador}${proyectoId}`;
  },

  /**
   * Determina si PostgreSQL debe usar SSL.
   *
   * DATABASE_SSL=false desactiva SSL.
   * DATABASE_SSL=true activa SSL.
   * En producción se activa por defecto.
   */
  obtenerConfiguracionSsl() {
    const valor =
      String(process.env.DATABASE_SSL || '')
        .trim()
        .toLowerCase();

    if (
      valor === 'false' ||
      valor === '0' ||
      valor === 'no'
    ) {
      return undefined;
    }

    if (
      valor === 'true' ||
      valor === '1' ||
      valor === 'yes'
    ) {
      return {
        rejectUnauthorized: false
      };
    }

    if (process.env.NODE_ENV === 'production') {
      return {
        rejectUnauthorized: false
      };
    }

    return undefined;
  },

  /**
   * Obtiene la conexión administrativa.
   *
   * Prioridad:
   * 1. DATABASE_ADMIN_URL
   * 2. DATABASE_URL
   *
   * DATABASE_ADMIN_URL debe usar un usuario con permiso CREATEDB.
   */
  obtenerConexionAdministrativa() {
    const connectionString =
      String(
        process.env.DATABASE_ADMIN_URL ||
        process.env.DATABASE_URL ||
        ''
      ).trim();

    if (!connectionString) {
      throw new Error(
        'No existe DATABASE_ADMIN_URL ni DATABASE_URL para administrar PostgreSQL.'
      );
    }

    let url;

    try {
      url = new URL(connectionString);
    } catch (error) {
      throw new Error(
        'DATABASE_ADMIN_URL o DATABASE_URL no contiene una URL PostgreSQL válida.'
      );
    }

    if (
      url.protocol !== 'postgresql:' &&
      url.protocol !== 'postgres:'
    ) {
      throw new Error(
        'La conexión administrativa debe comenzar con postgresql:// o postgres://'
      );
    }

    return connectionString;
  },

  /**
   * Crea un cliente PostgreSQL.
   */
  crearCliente(connectionString) {
    if (!connectionString) {
      throw new Error(
        'No se recibió una cadena de conexión PostgreSQL.'
      );
    }

    return new Client({
      connectionString,
      ssl: this.obtenerConfiguracionSsl(),
      connectionTimeoutMillis: 15000,
      query_timeout: 30000,
      statement_timeout: 30000
    });
  },

  /**
   * Escapa identificadores PostgreSQL.
   *
   * Los valores no se concatenan directamente sin pasar por este método.
   */
  escaparIdentificador(valor) {
    return `"${String(valor).replace(/"/g, '""')}"`;
  },

  /**
   * Obtiene el nombre de la base incluida en una DATABASE_URL.
   */
  obtenerNombreDesdeUrl(databaseUrl) {
    if (!databaseUrl) {
      return null;
    }

    try {
      const url = new URL(databaseUrl);

      const nombre =
        decodeURIComponent(
          url.pathname.replace(/^\/+/, '')
        ).trim();

      return nombre || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Comprueba si una base de datos existe.
   */
  async existeBase(nombreDB) {
    const nombreSeguro =
      this.normalizarNombre(nombreDB, 63);

    const client =
      this.crearCliente(
        this.obtenerConexionAdministrativa()
      );

    try {
      await client.connect();

      const resultado = await client.query(
        `
          SELECT 1
          FROM pg_database
          WHERE datname = $1
          LIMIT 1
        `,
        [nombreSeguro]
      );

      return resultado.rowCount > 0;
    } catch (error) {
      throw new Error(
        `No fue posible comprobar la base de datos: ${error.message}`
      );
    } finally {
      await client.end().catch(() => {});
    }
  },

  /**
   * Crea una base de datos independiente.
   */
  async crearBase(nombreDB) {
    const nombreSeguro =
      this.normalizarNombre(nombreDB, 63);

    if (!nombreSeguro) {
      throw new Error(
        'El nombre de la base de datos no es válido.'
      );
    }

    const client =
      this.crearCliente(
        this.obtenerConexionAdministrativa()
      );

    try {
      await client.connect();

      const existe = await client.query(
        `
          SELECT 1
          FROM pg_database
          WHERE datname = $1
          LIMIT 1
        `,
        [nombreSeguro]
      );

      if (existe.rowCount > 0) {
        sails.log.info(
          `🗄️ DemoFlow: La base ya existe: ${nombreSeguro}`
        );

        return {
          ok: true,
          creada: false,
          existe: true,
          nombre: nombreSeguro,
          databaseNombre: nombreSeguro,
          mensaje: 'La base de datos ya existía.'
        };
      }

      await client.query(
        `CREATE DATABASE ${this.escaparIdentificador(nombreSeguro)}`
      );

      sails.log.info(
        `✅ DemoFlow: Base PostgreSQL creada: ${nombreSeguro}`
      );

      return {
        ok: true,
        creada: true,
        existe: false,
        nombre: nombreSeguro,
        databaseNombre: nombreSeguro,
        mensaje: 'Base de datos creada correctamente.'
      };
    } catch (error) {
      /*
       * Código 42P04:
       * duplicate_database
       *
       * Puede ocurrir si dos procesos intentan crear la misma base
       * exactamente al mismo tiempo.
       */
      if (error && error.code === '42P04') {
        sails.log.warn(
          `⚠️ DemoFlow: La base fue creada por otro proceso: ${nombreSeguro}`
        );

        return {
          ok: true,
          creada: false,
          existe: true,
          nombre: nombreSeguro,
          databaseNombre: nombreSeguro,
          mensaje: 'La base de datos ya existía.'
        };
      }

      sails.log.error(
        `❌ DemoFlow: No fue posible crear la base ${nombreSeguro}:`,
        error.message
      );

      if (
        error &&
        (
          error.code === '42501' ||
          /permission denied/i.test(error.message || '') ||
          /must be able to create database/i.test(error.message || '')
        )
      ) {
        throw new Error(
          'El usuario PostgreSQL no tiene permiso para crear bases de datos. ' +
          'Configura DATABASE_ADMIN_URL con un usuario que tenga privilegio CREATEDB.'
        );
      }

      throw new Error(
        `No fue posible crear la base de datos: ${error.message}`
      );
    } finally {
      await client.end().catch(() => {});
    }
  },

  /**
   * Construye la DATABASE_URL de una base adicional.
   *
   * Conserva:
   * - servidor
   * - puerto
   * - usuario
   * - contraseña
   * - parámetros SSL
   */
  generarDatabaseUrl(nombreDB) {
    const nombreSeguro =
      this.normalizarNombre(nombreDB, 63);

    const conexionPrincipal =
      this.obtenerConexionAdministrativa();

    let url;

    try {
      url = new URL(conexionPrincipal);
    } catch (error) {
      throw new Error(
        'No fue posible interpretar la conexión administrativa.'
      );
    }

    url.pathname =
      `/${encodeURIComponent(nombreSeguro)}`;

    return url.toString();
  },

  /**
   * Prueba que una DATABASE_URL acepte conexiones.
   */
  async probarConexion(databaseUrl) {
    if (!databaseUrl) {
      return {
        ok: false,
        mensaje: 'No se recibió DATABASE_URL.'
      };
    }

    const client =
      this.crearCliente(databaseUrl);

    try {
      await client.connect();

      const resultado = await client.query(
        `
          SELECT
            NOW() AS fecha,
            current_database() AS database_name
        `
      );

      return {
        ok: true,
        databaseNombre:
          resultado.rows[0]
            ? resultado.rows[0].database_name
            : this.obtenerNombreDesdeUrl(databaseUrl),

        mensaje:
          'Conexión PostgreSQL correcta.'
      };
    } catch (error) {
      return {
        ok: false,
        mensaje:
          error.message || 'No fue posible conectar con PostgreSQL.'
      };
    } finally {
      await client.end().catch(() => {});
    }
  },

  /**
   * Prepara automáticamente la base de datos de un proyecto.
   *
   * Este método debe ejecutarse DESPUÉS de:
   *
   * Proyecto.create({...}).fetch()
   *
   * porque necesita proyecto.id.
   */
  async prepararBaseProyecto(proyecto) {
    if (!proyecto || !proyecto.id) {
      throw new Error(
        'Se necesita un proyecto guardado con identificador.'
      );
    }

    const nombreDB =
      this.generarNombreBase(proyecto);

    sails.log.info(
      '🗄️ DemoFlow: Preparando base PostgreSQL para proyecto:',
      proyecto.id,
      nombreDB
    );

    const resultadoCreacion =
      await this.crearBase(nombreDB);

    const databaseUrl =
      this.generarDatabaseUrl(nombreDB);

    const prueba =
      await this.probarConexion(databaseUrl);

    if (!prueba.ok) {
      throw new Error(
        `La base fue creada, pero la conexión falló: ${prueba.mensaje}`
      );
    }

    const resultado = {
      ok: true,

      databaseTipo:
        'postgresql',

      databaseNombre:
        nombreDB,

      databaseUrl,

      databaseEstado:
        'activa',

      /*
       * Campos de compatibilidad con código anterior.
       */
      nombreDB,
      nombre:
        nombreDB,

      creada:
        resultadoCreacion.creada === true,

      existe:
        resultadoCreacion.existe === true,

      mensaje:
        resultadoCreacion.mensaje ||
        'Base PostgreSQL preparada correctamente.'
    };

    sails.log.info(
      '✅ DemoFlow: Base PostgreSQL preparada correctamente:',
      {
        proyectoId:
          proyecto.id,

        databaseNombre:
          resultado.databaseNombre,

        databaseEstado:
          resultado.databaseEstado,

        creada:
          resultado.creada
      }
    );

    return resultado;
  },

  /**
   * Alias compatible con controladores que utilicen
   * crearBaseDatosProyecto().
   */
  async crearBaseDatosProyecto(proyecto) {
    return this.prepararBaseProyecto(proyecto);
  },

  /**
   * Comprueba una DATABASE_URL ingresada manualmente.
   */
  async prepararBaseManual(databaseUrl) {
    const valor =
      String(databaseUrl || '').trim();

    if (!valor) {
      throw new Error(
        'No se recibió una DATABASE_URL manual.'
      );
    }

    let url;

    try {
      url = new URL(valor);
    } catch (error) {
      throw new Error(
        'La DATABASE_URL manual no tiene un formato válido.'
      );
    }

    if (
      url.protocol !== 'postgresql:' &&
      url.protocol !== 'postgres:'
    ) {
      throw new Error(
        'DATABASE_URL debe comenzar con postgresql:// o postgres://'
      );
    }

    const databaseNombre =
      this.obtenerNombreDesdeUrl(valor);

    if (!databaseNombre) {
      throw new Error(
        'No fue posible identificar el nombre de la base en DATABASE_URL.'
      );
    }

    const prueba =
      await this.probarConexion(valor);

    if (!prueba.ok) {
      throw new Error(
        `La DATABASE_URL manual no permitió conexión: ${prueba.mensaje}`
      );
    }

    return {
      ok: true,
      databaseTipo:
        'postgresql',

      databaseNombre,

      databaseUrl:
        valor,

      databaseEstado:
        'configurada_manual',

      nombreDB:
        databaseNombre,

      nombre:
        databaseNombre,

      creada:
        false,

      existe:
        true,

      mensaje:
        'DATABASE_URL manual comprobada correctamente.'
    };
  },

  /**
   * Generador disponible para futuras credenciales independientes.
   */
  generarPassword(longitudBytes = 32) {
    const longitud =
      Number.isInteger(longitudBytes) &&
      longitudBytes >= 16 &&
      longitudBytes <= 128
        ? longitudBytes
        : 32;

    return crypto
      .randomBytes(longitud)
      .toString('hex');
  }

};