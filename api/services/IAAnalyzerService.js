/**
 * IAAnalyzerService.js
 * Analizador técnico e inteligente de proyectos DemoFlowApp
 *
 * Responsabilidades:
 * - Analizar proyectos localmente sin consumir OpenAI.
 * - Detectar HTML, Node.js, Sails.js, React y otras tecnologías.
 * - Revisar package.json, scripts y estructura básica.
 * - Preparar un resumen técnico seguro del proyecto.
 * - Ejecutar análisis avanzado mediante DemoFlowIAService.
 * - Descontar diamantes únicamente cuando usarIA = true.
 *
 * Compatible con:
 * - Sails.js 1.x
 * - Node.js 20+
 * - PostgreSQL
 */

'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {

  // =========================================
  // CONFIGURACIÓN
  // =========================================

  maxArchivosResumen: 60,

  maxCaracteresArchivo: 8000,

  extensionesPermitidas: [
    '.js',
    '.json',
    '.html',
    '.htm',
    '.css',
    '.ejs',
    '.md',
    '.txt',
    '.yml',
    '.yaml'
  ],

  carpetasIgnoradas: [
    'node_modules',
    '.git',
    '.cache',
    '.next',
    'dist',
    'build',
    'coverage',
    '.idea',
    '.vscode',
    'tmp',
    'temp',
    'logs',
    'uploads'
  ],

  archivosSensibles: [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    'id_rsa',
    'id_rsa.pub',
    'credentials.json',
    'service-account.json'
  ],

  // =========================================
  // UTILIDADES
  // =========================================

  normalizarTexto: function (valor) {
    return String(
      typeof valor === 'undefined' ||
      valor === null
        ? ''
        : valor
    ).trim();
  },

  rutaExiste: function (ruta) {
    try {
      return Boolean(
        ruta &&
        fs.existsSync(ruta)
      );
    } catch (error) {
      return false;
    }
  },

  leerJsonSeguro: function (ruta) {
    try {
      if (!this.rutaExiste(ruta)) {
        return {
          ok: false,
          datos: null,
          error: 'El archivo no existe.'
        };
      }

      const contenido =
        fs.readFileSync(
          ruta,
          'utf8'
        );

      const datos =
        JSON.parse(contenido);

      return {
        ok: true,
        datos,
        error: null
      };
    } catch (error) {
      return {
        ok: false,
        datos: null,
        error:
          error.message ||
          'El archivo JSON no es válido.'
      };
    }
  },

  esArchivoSensible: function (
    nombreArchivo
  ) {
    const nombre =
      this.normalizarTexto(
        nombreArchivo
      ).toLowerCase();

    if (!nombre) {
      return false;
    }

    if (
      this.archivosSensibles
        .map((item) =>
          item.toLowerCase()
        )
        .includes(nombre)
    ) {
      return true;
    }

    if (
      nombre.includes('secret') ||
      nombre.includes('credential') ||
      nombre.includes('private-key') ||
      nombre.includes('private_key')
    ) {
      return true;
    }

    return false;
  },

  debeIgnorarCarpeta: function (
    nombreCarpeta
  ) {
    const nombre =
      this.normalizarTexto(
        nombreCarpeta
      ).toLowerCase();

    return this.carpetasIgnoradas
      .map((item) =>
        item.toLowerCase()
      )
      .includes(nombre);
  },

  extensionPermitida: function (
    archivo
  ) {
    const extension =
      path.extname(
        archivo
      ).toLowerCase();

    return this.extensionesPermitidas
      .includes(extension);
  },

  agregarRecomendacion: function (
    resultado,
    mensaje
  ) {
    const texto =
      this.normalizarTexto(
        mensaje
      );

    if (!texto) {
      return;
    }

    if (
      !resultado.recomendaciones
        .includes(texto)
    ) {
      resultado.recomendaciones
        .push(texto);
    }
  },

  agregarError: function (
    resultado,
    mensaje
  ) {
    const texto =
      this.normalizarTexto(
        mensaje
      );

    if (!texto) {
      return;
    }

    if (
      !resultado.errores
        .includes(texto)
    ) {
      resultado.errores
        .push(texto);
    }
  },

  // =========================================
  // EXPLORAR ARCHIVOS DEL PROYECTO
  // =========================================

  listarArchivos: function (
    rutaProyecto,
    opciones = {}
  ) {
    const maxArchivos =
      Number(
        opciones.maxArchivos ||
        this.maxArchivosResumen
      );

    const archivos = [];

    const recorrer = (
      rutaActual,
      profundidad = 0
    ) => {
      if (
        archivos.length >= maxArchivos ||
        profundidad > 8
      ) {
        return;
      }

      let elementos = [];

      try {
        elementos =
          fs.readdirSync(
            rutaActual,
            {
              withFileTypes: true
            }
          );
      } catch (error) {
        return;
      }

      for (const elemento of elementos) {
        if (
          archivos.length >=
          maxArchivos
        ) {
          break;
        }

        const rutaCompleta =
          path.join(
            rutaActual,
            elemento.name
          );

        if (elemento.isDirectory()) {
          if (
            this.debeIgnorarCarpeta(
              elemento.name
            )
          ) {
            continue;
          }

          recorrer(
            rutaCompleta,
            profundidad + 1
          );

          continue;
        }

        if (!elemento.isFile()) {
          continue;
        }

        if (
          this.esArchivoSensible(
            elemento.name
          )
        ) {
          continue;
        }

        if (
          !this.extensionPermitida(
            elemento.name
          )
        ) {
          continue;
        }

        archivos.push({
          nombre: elemento.name,

          rutaRelativa:
            path.relative(
              rutaProyecto,
              rutaCompleta
            ).replace(
              /\\/g,
              '/'
            ),

          rutaCompleta
        });
      }
    };

    recorrer(rutaProyecto);

    return archivos;
  },

  leerArchivoSeguro: function (
    rutaArchivo
  ) {
    try {
      const estadisticas =
        fs.statSync(
          rutaArchivo
        );

      if (
        !estadisticas.isFile()
      ) {
        return '';
      }

      const maxBytes =
        Math.max(
          1000,
          Number(
            this.maxCaracteresArchivo
          )
        );

      const contenido =
        fs.readFileSync(
          rutaArchivo,
          'utf8'
        );

      return contenido.slice(
        0,
        maxBytes
      );
    } catch (error) {
      return '';
    }
  },

  // =========================================
  // DETECTAR TECNOLOGÍAS
  // =========================================

  detectarTecnologias: function ({
    packageJson = {},
    rutaProyecto
  }) {
    const dependencias =
      Object.assign(
        {},
        packageJson.dependencies || {},
        packageJson.devDependencies || {}
      );

    const tecnologias = [];

    const agregar = (nombre) => {
      if (
        nombre &&
        !tecnologias.includes(nombre)
      ) {
        tecnologias.push(nombre);
      }
    };

    if (dependencias.sails) {
      agregar('Sails.js');
    }

    if (dependencias.express) {
      agregar('Express');
    }

    if (dependencias.react) {
      agregar('React');
    }

    if (dependencias.next) {
      agregar('Next.js');
    }

    if (dependencias.vue) {
      agregar('Vue.js');
    }

    if (dependencias.angular) {
      agregar('Angular');
    }

    if (
      dependencias.pg ||
      dependencias.postgresql
    ) {
      agregar('PostgreSQL');
    }

    if (
      dependencias.mysql ||
      dependencias.mysql2
    ) {
      agregar('MySQL');
    }

    if (
      dependencias.mongodb ||
      dependencias.mongoose
    ) {
      agregar('MongoDB');
    }

    if (
      dependencias.bootstrap
    ) {
      agregar('Bootstrap');
    }

    if (
      dependencias.tailwindcss
    ) {
      agregar('Tailwind CSS');
    }

    if (
      dependencias.typescript
    ) {
      agregar('TypeScript');
    }

    if (
      Object.keys(dependencias)
        .length > 0
    ) {
      agregar('Node.js');
    }

    const indexHtml =
      path.join(
        rutaProyecto,
        'index.html'
      );

    if (
      this.rutaExiste(indexHtml)
    ) {
      agregar('HTML');
      agregar('CSS');
      agregar('JavaScript');
    }

    return tecnologias;
  },

  obtenerTecnologiaPrincipal:
  function (resultado) {
    if (resultado.tieneSails) {
      return 'Sails.js + Node.js';
    }

    if (resultado.tieneNext) {
      return 'Next.js + React';
    }

    if (resultado.tieneReact) {
      return 'React';
    }

    if (resultado.tieneVue) {
      return 'Vue.js';
    }

    if (resultado.tieneAngular) {
      return 'Angular';
    }

    if (
      resultado.tienePackageJson
    ) {
      return 'Node.js';
    }

    if (resultado.tieneHTML) {
      return 'HTML + CSS + JavaScript';
    }

    return 'Demo externa';
  },

  // =========================================
  // CREAR RESUMEN PARA OPENAI
  // =========================================

  construirResumenIA: function (
    resultado,
    rutaProyecto
  ) {
    const archivos =
      this.listarArchivos(
        rutaProyecto
      );

    const secciones = [];

    secciones.push(
      [
        'RESUMEN TÉCNICO DETECTADO POR DEMOFLOW',
        `Tecnología principal: ${resultado.tecnologia}`,
        `Tecnologías: ${
          resultado.tecnologias.length
            ? resultado.tecnologias.join(', ')
            : 'No determinadas'
        }`,
        `Tiene package.json: ${resultado.tienePackageJson}`,
        `Tiene index.html: ${resultado.tieneHTML}`,
        `Tiene Sails.js: ${resultado.tieneSails}`,
        `Tiene React: ${resultado.tieneReact}`,
        `Tiene Node.js: ${resultado.tieneNode}`,
        `Tiene node_modules: ${resultado.tieneNodeModules}`,
        `Tiene script start: ${resultado.tieneScriptStart}`,
        `Listo para deploy: ${resultado.listoParaDeploy}`
      ].join('\n')
    );

    if (
      resultado.recomendaciones
        .length > 0
    ) {
      secciones.push(
        [
          'RECOMENDACIONES DEL ANALIZADOR LOCAL',
          ...resultado.recomendaciones
            .map(
              (item, indice) =>
                `${indice + 1}. ${item}`
            )
        ].join('\n')
      );
    }

    if (
      resultado.errores.length > 0
    ) {
      secciones.push(
        [
          'ERRORES DETECTADOS',
          ...resultado.errores
            .map(
              (item, indice) =>
                `${indice + 1}. ${item}`
            )
        ].join('\n')
      );
    }

    secciones.push(
      [
        'ARCHIVOS ENCONTRADOS',
        ...archivos.map(
          (archivo) =>
            `- ${archivo.rutaRelativa}`
        )
      ].join('\n')
    );

    /*
     * Se incluyen fragmentos de archivos
     * relevantes, pero nunca archivos .env,
     * credenciales ni claves privadas.
     */
    const archivosPrioritarios =
      archivos.filter(
        (archivo) => {
          const nombre =
            archivo.nombre
              .toLowerCase();

          return (
            nombre === 'package.json' ||
            nombre === 'index.html' ||
            nombre === 'app.js' ||
            nombre === 'server.js' ||
            nombre === 'config.js' ||
            nombre === 'routes.js' ||
            nombre === 'readme.md'
          );
        }
      ).slice(0, 10);

    for (
      const archivo of
      archivosPrioritarios
    ) {
      const contenido =
        this.leerArchivoSeguro(
          archivo.rutaCompleta
        );

      if (!contenido) {
        continue;
      }

      secciones.push(
        [
          `ARCHIVO: ${archivo.rutaRelativa}`,
          contenido
        ].join('\n')
      );
    }

    return secciones
      .join('\n\n')
      .slice(
        0,
        Math.max(
          1000,
          Number(
            process.env
              .OPENAI_MAX_INPUT_CHARS ||
            60000
          )
        )
      );
  },

  // =========================================
  // ANÁLISIS LOCAL GRATUITO
  // =========================================

  analizarLocal: async function (
    rutaProyecto
  ) {
    const resultado = {
      tecnologia: 'Demo externa',
      tecnologias: [],

      tienePackageJson: false,
      tieneNodeModules: false,
      tieneNode: false,

      tieneSails: false,
      tieneReact: false,
      tieneNext: false,
      tieneVue: false,
      tieneAngular: false,

      tieneHTML: false,
      tieneScriptStart: false,

      listoParaDeploy: true,

      recomendaciones: [],
      errores: [],

      analisisLocal: true,

      ia: {
        solicitada: false,
        disponible: false,
        costo: 0,
        saldo: null,
        respuesta: null,
        error: null
      }
    };

    try {
      if (
        !rutaProyecto ||
        !this.rutaExiste(
          rutaProyecto
        )
      ) {
        this.agregarRecomendacion(
          resultado,
          'DemoFlow no encontró una carpeta local. Posiblemente se trata de una URL externa.'
        );

        return resultado;
      }

      const estadisticas =
        fs.statSync(
          rutaProyecto
        );

      if (
        !estadisticas.isDirectory()
      ) {
        this.agregarError(
          resultado,
          'La ruta indicada no corresponde a una carpeta de proyecto.'
        );

        resultado.listoParaDeploy =
          false;

        return resultado;
      }

      // =====================================
      // PACKAGE.JSON
      // =====================================

      const packagePath =
        path.join(
          rutaProyecto,
          'package.json'
        );

      let packageJson = {};

      if (
        this.rutaExiste(
          packagePath
        )
      ) {
        resultado.tienePackageJson =
          true;

        resultado.tieneNode = true;

        const lectura =
          this.leerJsonSeguro(
            packagePath
          );

        if (lectura.ok) {
          packageJson =
            lectura.datos || {};
        } else {
          this.agregarError(
            resultado,
            'package.json no tiene un formato JSON válido.'
          );

          resultado.listoParaDeploy =
            false;
        }

        const dependencias =
          Object.assign(
            {},
            packageJson.dependencies ||
              {},
            packageJson
              .devDependencies ||
              {}
          );

        resultado.tieneSails =
          Boolean(
            dependencias.sails
          );

        resultado.tieneReact =
          Boolean(
            dependencias.react
          );

        resultado.tieneNext =
          Boolean(
            dependencias.next
          );

        resultado.tieneVue =
          Boolean(
            dependencias.vue
          );

        resultado.tieneAngular =
          Boolean(
            dependencias.angular ||
            dependencias[
              '@angular/core'
            ]
          );

        resultado.tieneScriptStart =
          Boolean(
            packageJson.scripts &&
            packageJson.scripts.start
          );

        if (
          resultado.tieneScriptStart
        ) {
          this.agregarRecomendacion(
            resultado,
            'Script start detectado correctamente.'
          );
        } else {
          this.agregarRecomendacion(
            resultado,
            'Agrega un script start en package.json para mejorar el deploy de aplicaciones Node.js.'
          );
        }

        if (
          !packageJson.name
        ) {
          this.agregarRecomendacion(
            resultado,
            'Agrega el campo name en package.json.'
          );
        }

        if (
          !packageJson.version
        ) {
          this.agregarRecomendacion(
            resultado,
            'Agrega el campo version en package.json.'
          );
        }

        if (
          !packageJson.engines ||
          !packageJson.engines.node
        ) {
          this.agregarRecomendacion(
            resultado,
            'Define engines.node en package.json para controlar la versión de Node.js usada durante el deploy.'
          );
        }
      }

      // =====================================
      // HTML
      // =====================================

      const htmlPath =
        path.join(
          rutaProyecto,
          'index.html'
        );

      if (
        this.rutaExiste(htmlPath)
      ) {
        resultado.tieneHTML =
          true;

        this.agregarRecomendacion(
          resultado,
          'Proyecto frontend detectado y preparado para deploy estático.'
        );
      }

      // =====================================
      // NODE_MODULES
      // =====================================

      const nodeModulesPath =
        path.join(
          rutaProyecto,
          'node_modules'
        );

      if (
        this.rutaExiste(
          nodeModulesPath
        )
      ) {
        resultado.tieneNodeModules =
          true;
      } else if (
        resultado.tienePackageJson
      ) {
        this.agregarRecomendacion(
          resultado,
          'node_modules no está incluido. DemoFlow puede instalar las dependencias mediante npm install.'
        );
      }

      // =====================================
      // TECNOLOGÍAS
      // =====================================

      resultado.tecnologias =
        this.detectarTecnologias({
          packageJson,
          rutaProyecto
        });

      resultado.tecnologia =
        this.obtenerTecnologiaPrincipal(
          resultado
        );

      if (resultado.tieneSails) {
        this.agregarRecomendacion(
          resultado,
          'Aplicación Sails.js detectada y compatible con el Runtime Manager de DemoFlow.'
        );
      }

      if (resultado.tieneReact) {
        this.agregarRecomendacion(
          resultado,
          'Aplicación React detectada.'
        );
      }

      if (resultado.tieneNext) {
        this.agregarRecomendacion(
          resultado,
          'Aplicación Next.js detectada. Verifica el comando de construcción y ejecución.'
        );
      }

      if (resultado.tieneVue) {
        this.agregarRecomendacion(
          resultado,
          'Aplicación Vue.js detectada.'
        );
      }

      if (resultado.tieneAngular) {
        this.agregarRecomendacion(
          resultado,
          'Aplicación Angular detectada.'
        );
      }

      // =====================================
      // PREPARACIÓN PARA DEPLOY
      // =====================================

      const tieneTecnologiaCompatible =
        resultado.tieneHTML ||
        resultado.tienePackageJson ||
        resultado.tieneSails ||
        resultado.tieneReact ||
        resultado.tieneNext ||
        resultado.tieneVue ||
        resultado.tieneAngular;

      if (
        !tieneTecnologiaCompatible
      ) {
        resultado.listoParaDeploy =
          false;

        this.agregarRecomendacion(
          resultado,
          'Agrega package.json o index.html para que DemoFlow detecte correctamente el proyecto.'
        );
      }

      if (
        resultado.tienePackageJson &&
        !resultado.tieneScriptStart &&
        (
          resultado.tieneSails ||
          (
            resultado.tieneNode &&
            !resultado.tieneReact
          )
        )
      ) {
        resultado.listoParaDeploy =
          false;
      }

      if (
        resultado.errores.length > 0
      ) {
        resultado.listoParaDeploy =
          false;
      }

      if (
        resultado.recomendaciones
          .length === 0
      ) {
        this.agregarRecomendacion(
          resultado,
          'Proyecto registrado correctamente en DemoFlow.'
        );
      }

      return resultado;
    } catch (error) {
      if (
        typeof sails !==
          'undefined' &&
        sails.log
      ) {
        sails.log.error(
          '❌ IA DemoFlow: Error en el analizador local.',
          {
            mensaje:
              error.message,
            stack:
              error.stack
          }
        );
      } else {
        console.error(
          'IAAnalyzerService ERROR:',
          error
        );
      }

      resultado.listoParaDeploy =
        false;

      this.agregarError(
        resultado,
        error.message ||
        'Error desconocido analizando el proyecto.'
      );

      return resultado;
    }
  },

  // =========================================
  // ANÁLISIS PRINCIPAL
  // =========================================

  /**
   * Uso gratuito:
   *
   * await IAAnalyzerService.analizarProyecto(
   *   rutaProyecto
   * );
   *
   * Uso con OpenAI y diamantes:
   *
   * await IAAnalyzerService.analizarProyecto(
   *   rutaProyecto,
   *   {
   *     usarIA: true,
   *     usuarioId: 1,
   *     proyectoId: 15
   *   }
   * );
   */
  analizarProyecto: async function (
    rutaProyecto,
    opciones = {}
  ) {
    const resultado =
      await this.analizarLocal(
        rutaProyecto
      );

    const usarIA =
      opciones.usarIA === true;

    /*
     * Subir, registrar o desplegar un proyecto
     * no consume diamantes automáticamente.
     */
    if (!usarIA) {
      return resultado;
    }

    resultado.ia.solicitada =
      true;

    const usuarioId =
      Number(
        opciones.usuarioId
      );

    const proyectoId =
      opciones.proyectoId
        ? Number(
            opciones.proyectoId
          )
        : null;

    if (
      !Number.isSafeInteger(
        usuarioId
      ) ||
      usuarioId <= 0
    ) {
      resultado.ia.disponible =
        false;

      resultado.ia.error =
        'Se requiere un usuario válido para ejecutar el análisis avanzado.';

      return resultado;
    }

    if (
      !rutaProyecto ||
      !this.rutaExiste(
        rutaProyecto
      )
    ) {
      resultado.ia.disponible =
        false;

      resultado.ia.error =
        'El análisis avanzado requiere una carpeta local disponible.';

      return resultado;
    }

    try {
      const contenido =
        this.construirResumenIA(
          resultado,
          rutaProyecto
        );

      const respuestaIA =
        await DemoFlowIAService
          .analizarProyecto({
            usuarioId,
            proyectoId,
            contenido,

            contexto: [
              `Tecnología detectada: ${resultado.tecnologia}.`,
              `Listo para deploy: ${resultado.listoParaDeploy}.`,
              'El análisis local ya fue realizado por IAAnalyzerService.',
              'No inventes archivos ni resultados que no estén incluidos en el resumen.'
            ].join(' ')
          });

      resultado.ia = {
        solicitada: true,
        disponible: true,

        referencia:
          respuestaIA.referencia ||
          null,

        herramienta:
          respuestaIA.herramienta ||
          'analizar_proyecto',

        costo:
          Number(
            respuestaIA.costo || 0
          ),

        saldoAnterior:
          typeof respuestaIA
            .saldoAnterior !==
            'undefined'
            ? respuestaIA
                .saldoAnterior
            : null,

        saldo:
          typeof respuestaIA.saldo !==
            'undefined'
            ? respuestaIA.saldo
            : null,

        modelo:
          respuestaIA.modelo ||
          null,

        respuestaId:
          respuestaIA
            .respuestaId ||
          null,

        respuesta:
          respuestaIA.respuesta ||
          respuestaIA.texto ||
          '',

        usage:
          respuestaIA.usage ||
          null,

        error: null
      };

      sails.log.info(
        '✅ IA DemoFlow: Proyecto analizado con IA avanzada.',
        {
          usuario:
            usuarioId,
          proyecto:
            proyectoId,
          tecnologia:
            resultado.tecnologia,
          costo:
            resultado.ia.costo,
          saldo:
            resultado.ia.saldo,
          referencia:
            resultado.ia.referencia
        }
      );

      return resultado;
    } catch (error) {
      resultado.ia = {
        solicitada: true,
        disponible: false,

        costo: 0,
        saldo: null,
        respuesta: null,

        codigo:
          error.code ||
          null,

        error:
          error.message ||
          'No fue posible obtener el análisis inteligente.'
      };

      if (
        typeof sails !==
          'undefined' &&
        sails.log
      ) {
        sails.log.error(
          '❌ IA DemoFlow: Error en análisis avanzado.',
          {
            usuario:
              usuarioId,
            proyecto:
              proyectoId,
            codigo:
              error.code ||
              null,
            mensaje:
              error.message
          }
        );
      }

      /*
       * El análisis local sigue disponible,
       * aunque OpenAI falle o no haya saldo.
       */
      return resultado;
    }
  }

};