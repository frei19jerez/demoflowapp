/**
 * DemoFlowIAService.js
 * Servicio central de inteligencia artificial de DemoFlowApp
 *
 * Responsabilidades:
 * - Conectarse de forma segura con OpenAI.
 * - Centralizar todas las funciones de DemoFlow IA.
 * - Validar acceso IA del usuario.
 * - Cobrar créditos/diamantes según la herramienta.
 * - Devolver créditos cuando la petición falla.
 * - Registrar consumo, tokens y auditoría.
 * - Evitar exponer claves, contraseñas o respuestas sensibles.
 *
 * Compatible con:
 * - Sails.js 1.x
 * - Node.js 20+
 * - PostgreSQL
 * - OpenAI Responses API
 */

'use strict';

const crypto = require('crypto');

module.exports = {

  // =========================================
  // CONFIGURACIÓN GENERAL
  // =========================================

  nombre: 'DemoFlow IA',

  apiUrl:
    process.env.OPENAI_API_URL ||
    'https://api.openai.com/v1/responses',

  modelo:
    process.env.OPENAI_MODEL ||
    'gpt-5-mini',

  timeoutMs: Math.max(
    10000,
    Number(
      process.env.OPENAI_TIMEOUT_MS ||
      120000
    )
  ),

  maxOutputTokens: Math.max(
    100,
    Number(
      process.env.OPENAI_MAX_OUTPUT_TOKENS ||
      2000
    )
  ),

  /**
   * Costos iniciales en diamantes.
   *
   * Más adelante pueden trasladarse a:
   * - Base de datos.
   * - Panel administrativo.
   * - Configuración por plan.
   */
  costos: {
    chat: 1,
    explicar_error: 1,
    analizar_proyecto: 2,
    generar_readme: 2,
    optimizar_codigo: 3,
    revisar_seguridad: 3,
    analizar_seo: 3,
    traducir_proyecto: 3,
    generar_documentacion: 5,
    analizar_arquitectura: 5,
    analizar_potencial_comercial: 3
  },

  // Evita procesar simultáneamente dos cobros
  // para el mismo usuario dentro de este proceso.
  _usuariosEnProceso: new Set(),

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

  numeroSeguro: function (
    valor,
    valorPredeterminado = 0
  ) {
    const numero = Number(valor);

    return Number.isFinite(numero)
      ? numero
      : valorPredeterminado;
  },

  generarReferencia: function () {
    return [
      'IA',
      Date.now(),
      crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()
    ].join('-');
  },

  obtenerConfiguracion: function () {
    const apiKey =
      this.normalizarTexto(
        process.env.OPENAI_API_KEY
      );

    if (!apiKey) {
      const error = new Error(
        'OPENAI_API_KEY no está configurada.'
      );

      error.code =
        'OPENAI_API_KEY_MISSING';

      throw error;
    }

    return {
      apiKey,
      apiUrl: this.apiUrl,
      modelo: this.modelo,
      timeoutMs: this.timeoutMs,
      maxOutputTokens:
        this.maxOutputTokens
    };
  },

  obtenerCosto: function (herramienta) {
    const codigo =
      this.normalizarTexto(
        herramienta
      ).toLowerCase();

    const costo =
      this.numeroSeguro(
        this.costos[codigo],
        1
      );

    return Math.max(
      1,
      Math.trunc(costo)
    );
  },

  filtrarAtributosModelo: function (
    modelo,
    datos
  ) {
    if (
      !modelo ||
      !modelo.attributes ||
      !datos ||
      typeof datos !== 'object'
    ) {
      return {};
    }

    const resultado = {};

    Object.keys(datos).forEach(
      (campo) => {
        if (
          Object.prototype
            .hasOwnProperty.call(
              modelo.attributes,
              campo
            ) &&
          typeof datos[campo] !==
            'undefined'
        ) {
          resultado[campo] =
            datos[campo];
        }
      }
    );

    return resultado;
  },

  // =========================================
  // VALIDAR USUARIO
  // =========================================

  obtenerUsuario: async function (
    usuarioId
  ) {
    const id = Number(usuarioId);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      const error = new Error(
        'Usuario requerido para utilizar DemoFlow IA.'
      );

      error.code =
        'IA_USUARIO_INVALIDO';

      throw error;
    }

    const usuario =
      await Usuario.findOne({
        id
      });

    if (!usuario) {
      const error = new Error(
        'Usuario no encontrado.'
      );

      error.code =
        'IA_USUARIO_NO_ENCONTRADO';

      throw error;
    }

    if (
      typeof usuario.activo !==
        'undefined' &&
      usuario.activo === false
    ) {
      const error = new Error(
        'El usuario está inactivo.'
      );

      error.code =
        'IA_USUARIO_INACTIVO';

      throw error;
    }

    return usuario;
  },

  tieneAccesoIA: function (usuario) {
    if (!usuario) {
      return false;
    }

    /*
     * Compatibilidad con los campos
     * utilizados en diferentes versiones
     * de DemoFlowApp.
     */
    if (usuario.accesoIA === true) {
      return true;
    }

    if (usuario.acceso_ia === true) {
      return true;
    }

    if (usuario.premium === true) {
      return true;
    }

    if (usuario.esPremium === true) {
      return true;
    }

    if (
      this.normalizarTexto(
        usuario.estadoPremium
      ).toLowerCase() === 'activo'
    ) {
      return true;
    }

    return false;
  },

  validarAcceso: async function ({
    usuarioId,
    costo
  }) {
    const usuario =
      await this.obtenerUsuario(
        usuarioId
      );

    if (!this.tieneAccesoIA(usuario)) {
      const error = new Error(
        'No tienes acceso a DemoFlow IA. Activa un plan Premium.'
      );

      error.code =
        'IA_SIN_ACCESO';

      throw error;
    }

    const saldo =
      Math.max(
        0,
        Math.trunc(
          this.numeroSeguro(
            usuario.creditos,
            0
          )
        )
      );

    if (saldo < costo) {
      const error = new Error(
        `No tienes suficientes diamantes. Necesitas ${costo} y tienes ${saldo}.`
      );

      error.code =
        'IA_CREDITOS_INSUFICIENTES';

      error.saldo = saldo;
      error.costo = costo;

      throw error;
    }

    return {
      usuario,
      saldo,
      costo
    };
  },

  // =========================================
  // CRÉDITOS / DIAMANTES
  // =========================================

  descontarCreditos: async function ({
    usuario,
    cantidad
  }) {
    const costo =
      Math.max(
        1,
        Math.trunc(
          this.numeroSeguro(
            cantidad,
            1
          )
        )
      );

    const saldoActual =
      Math.max(
        0,
        Math.trunc(
          this.numeroSeguro(
            usuario.creditos,
            0
          )
        )
      );

    if (saldoActual < costo) {
      const error = new Error(
        'Créditos IA insuficientes.'
      );

      error.code =
        'IA_CREDITOS_INSUFICIENTES';

      throw error;
    }

    const nuevoSaldo =
      saldoActual - costo;

    /*
     * Se incluye el saldo actual en el criterio.
     * Esto ayuda a evitar que dos operaciones
     * descuenten simultáneamente sobre el mismo
     * valor leído.
     */
    const actualizado =
      await Usuario.updateOne({
        id: usuario.id,
        creditos: saldoActual
      }).set({
        creditos: nuevoSaldo
      });

    if (!actualizado) {
      const error = new Error(
        'El saldo cambió mientras se procesaba la solicitud. Intenta nuevamente.'
      );

      error.code =
        'IA_SALDO_MODIFICADO';

      throw error;
    }

    return {
      usuario: actualizado,
      saldoAnterior: saldoActual,
      saldo: nuevoSaldo,
      descontados: costo
    };
  },

  devolverCreditos: async function ({
    usuarioId,
    cantidad
  }) {
    const usuario =
      await Usuario.findOne({
        id: Number(usuarioId)
      });

    if (!usuario) {
      return {
        ok: false,
        devueltos: 0
      };
    }

    const cantidadFinal =
      Math.max(
        0,
        Math.trunc(
          this.numeroSeguro(
            cantidad,
            0
          )
        )
      );

    if (cantidadFinal === 0) {
      return {
        ok: true,
        devueltos: 0,
        saldo:
          Number(usuario.creditos || 0)
      };
    }

    const saldoActual =
      Math.max(
        0,
        Math.trunc(
          this.numeroSeguro(
            usuario.creditos,
            0
          )
        )
      );

    const nuevoSaldo =
      saldoActual +
      cantidadFinal;

    const actualizado =
      await Usuario.updateOne({
        id: usuario.id,
        creditos: saldoActual
      }).set({
        creditos: nuevoSaldo
      });

    if (!actualizado) {
      sails.log.warn(
        '⚠️ IA DemoFlow: No fue posible devolver créditos automáticamente.',
        {
          usuario: usuario.id,
          cantidad: cantidadFinal
        }
      );

      return {
        ok: false,
        devueltos: 0
      };
    }

    return {
      ok: true,
      devueltos: cantidadFinal,
      saldo: nuevoSaldo
    };
  },

  // =========================================
  // RESPUESTA DE OPENAI
  // =========================================

  extraerTextoRespuesta: function (
    respuesta
  ) {
    if (!respuesta) {
      return '';
    }

    if (
      typeof respuesta.output_text ===
        'string' &&
      respuesta.output_text.trim()
    ) {
      return respuesta.output_text.trim();
    }

    if (!Array.isArray(respuesta.output)) {
      return '';
    }

    const textos = [];

    respuesta.output.forEach(
      (item) => {
        if (
          !item ||
          !Array.isArray(item.content)
        ) {
          return;
        }

        item.content.forEach(
          (contenido) => {
            if (!contenido) {
              return;
            }

            if (
              typeof contenido.text ===
                'string' &&
              contenido.text.trim()
            ) {
              textos.push(
                contenido.text.trim()
              );
            }
          }
        );
      }
    );

    return textos.join('\n\n').trim();
  },

  construirInstrucciones: function ({
    herramienta,
    contexto = ''
  }) {
    return `
Eres DemoFlow IA, el asistente especializado de DemoFlowApp.

DemoFlowApp es una plataforma SaaS para que programadores:
- Suban proyectos mediante ZIP.
- Importen proyectos desde GitHub.
- Publiquen demos HTML, Node.js y Sails.js.
- Ejecuten aplicaciones mediante runtimes.
- Actualicen proyectos desde Git.
- Analicen y mejoren aplicaciones.
- Presenten demos en vivo a clientes.

Herramienta activa: ${herramienta}.

REGLAS:
1. Responde en español claro y profesional.
2. Ayuda al desarrollador con resultados concretos.
3. No inventes archivos, dependencias ni resultados.
4. Diferencia claramente errores, riesgos y recomendaciones.
5. Prioriza seguridad, rendimiento, estabilidad y facilidad de despliegue.
6. No reveles claves API, contraseñas, tokens ni variables sensibles.
7. Cuando analices código, entrega ejemplos utilizables.
8. Cuando no haya información suficiente, indícalo claramente.
9. No afirmes que ejecutaste o probaste código si no ocurrió.
10. Evita respuestas innecesariamente extensas.

Contexto adicional de DemoFlowApp:
${this.normalizarTexto(contexto) || 'Sin contexto adicional.'}
    `.trim();
  },

 solicitarOpenAI: async function ({
  instrucciones,
  entrada,
  modelo,
  maxOutputTokens
}) {
  const configuracion =
    this.obtenerConfiguracion();

  const controlador =
    new AbortController();

  const temporizador =
    setTimeout(
      () => controlador.abort(),
      configuracion.timeoutMs
    );

  try {

    const respuesta =
      await fetch(
        configuracion.apiUrl,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${configuracion.apiKey}`,

            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({

            model:
              modelo ||
              configuracion.modelo,

            instructions:
              instrucciones,

            input:
              entrada,

            max_output_tokens:
              Math.max(
                100,
                Number(
                  maxOutputTokens ||
                  configuracion.maxOutputTokens
                )
              )

          }),

          signal:
            controlador.signal
        }
      );

    const cuerpoTexto =
      await respuesta.text();

    let datos = {};

    try {

      datos =
        cuerpoTexto
          ? JSON.parse(cuerpoTexto)
          : {};

    } catch (error) {

      datos = {
        raw: cuerpoTexto
      };

    }

    if (!respuesta.ok) {

      const mensajeProveedor =
        datos &&
        datos.error &&
        datos.error.message
          ? datos.error.message
          : `OpenAI respondió HTTP ${respuesta.status}.`;

      const error =
        new Error(
          mensajeProveedor
        );

      error.code =
        'OPENAI_API_ERROR';

      error.status =
        respuesta.status;

      throw error;

    }

    const texto =
      this.extraerTextoRespuesta(
        datos
      );

    if (!texto) {

      const error =
        new Error(
          'OpenAI no devolvió contenido de texto.'
        );

      error.code =
        'OPENAI_EMPTY_RESPONSE';

      throw error;

    }

    return {

      ok: true,

      id:
        datos.id || null,

      modelo:
        datos.model ||
        modelo ||
        configuracion.modelo,

      texto,

      usage:
        datos.usage || null,

      status:
        datos.status || null

    };

  } catch (error) {

    if (
      error &&
      error.name === 'AbortError'
    ) {

      const timeoutError =
        new Error(
          'DemoFlow IA tardó demasiado en responder.'
        );

      timeoutError.code =
        'OPENAI_TIMEOUT';

      throw timeoutError;

    }

    throw error;

  } finally {

    clearTimeout(
      temporizador
    );

  }
},


  // =========================================
  // REGISTRAR HISTORIAL IA
  // =========================================

  registrarHistorial: async function ({
    usuario,
    proyecto = null,
    herramienta,
    referencia,
    costo,
    saldoAnterior,
    saldoFinal,
    estado,
    modelo = null,
    respuestaId = null,
    usage = null,
    error = null
  }) {
    /*
     * DemoFlowApp ya puede tener un modelo
     * llamado IaHistorial, IAHistorial o
     * ia_historial según la versión.
     */
    let modeloHistorial = null;

    if (
      typeof IaHistorial !==
        'undefined' &&
      IaHistorial
    ) {
      modeloHistorial =
        IaHistorial;
    } else if (
      typeof IAHistorial !==
        'undefined' &&
      IAHistorial
    ) {
      modeloHistorial =
        IAHistorial;
    }

    if (
      !modeloHistorial ||
      !modeloHistorial.attributes
    ) {
      return {
        ok: true,
        omitido: true
      };
    }

    const datos = {
      usuario,
      proyecto,
      herramienta,
      tipo: herramienta,
      referencia,
      costo,
      creditos: costo,
      saldoAnterior,
      saldoFinal,
      estado,
      modelo,
      respuestaId,
      tokensEntrada:
        usage &&
        (
          usage.input_tokens ??
          usage.prompt_tokens
        )
          ? Number(
              usage.input_tokens ??
              usage.prompt_tokens
            )
          : null,

      tokensSalida:
        usage &&
        (
          usage.output_tokens ??
          usage.completion_tokens
        )
          ? Number(
              usage.output_tokens ??
              usage.completion_tokens
            )
          : null,

      tokensTotales:
        usage &&
        usage.total_tokens
          ? Number(
              usage.total_tokens
            )
          : null,

      detalle:
        error
          ? this.normalizarTexto(
              error.message
            ).slice(0, 500)
          : null,

      metadata:
        JSON.stringify({
          usage: usage || null,
          error:
            error
              ? {
                  code:
                    error.code || null,
                  message:
                    this.normalizarTexto(
                      error.message
                    ).slice(0, 500)
                }
              : null
        })
    };

    const datosFinales =
      this.filtrarAtributosModelo(
        modeloHistorial,
        datos
      );

    if (
      Object.keys(datosFinales)
        .length === 0
    ) {
      return {
        ok: true,
        omitido: true
      };
    }

    try {
      const historial =
        await modeloHistorial
          .create(datosFinales)
          .fetch();

      return {
        ok: true,
        historial
      };
    } catch (errorHistorial) {
      sails.log.warn(
        '⚠️ IA DemoFlow: No fue posible registrar el historial IA.',
        {
          usuario,
          herramienta,
          mensaje:
            errorHistorial.message
        }
      );

      return {
        ok: false,
        error:
          errorHistorial.message
      };
    }
  },

  // =========================================
  // EJECUTAR HERRAMIENTA IA
  // =========================================

  ejecutar: async function ({
    usuarioId,
    proyectoId = null,
    herramienta = 'chat',
    entrada,
    contexto = '',
    modelo = null,
    maxOutputTokens = null
  }) {
    const usuarioNumero =
      Number(usuarioId);

    const herramientaFinal =
      this.normalizarTexto(
        herramienta || 'chat'
      ).toLowerCase();

    const entradaFinal =
      this.normalizarTexto(
        entrada
      );

    if (!entradaFinal) {
      const error = new Error(
        'Debes enviar contenido para utilizar DemoFlow IA.'
      );

      error.code =
        'IA_ENTRADA_VACIA';

      throw error;
    }

    /*
     * Evita enviar cantidades descontroladas
     * de texto accidentalmente.
     */
    const maxCaracteres =
      Math.max(
        1000,
        Number(
          process.env
            .OPENAI_MAX_INPUT_CHARS ||
          60000
        )
      );

    if (
      entradaFinal.length >
      maxCaracteres
    ) {
      const error = new Error(
        `El contenido supera el límite de ${maxCaracteres} caracteres.`
      );

      error.code =
        'IA_ENTRADA_DEMASIADO_GRANDE';

      throw error;
    }

    if (
      this._usuariosEnProceso.has(
        usuarioNumero
      )
    ) {
      const error = new Error(
        'Ya hay una solicitud de IA en proceso para este usuario.'
      );

      error.code =
        'IA_SOLICITUD_EN_PROCESO';

      throw error;
    }

    this._usuariosEnProceso.add(
      usuarioNumero
    );

    const referencia =
      this.generarReferencia();

    const costo =
      this.obtenerCosto(
        herramientaFinal
      );

    let descuento = null;

    try {
      const validacion =
        await this.validarAcceso({
          usuarioId:
            usuarioNumero,
          costo
        });

      descuento =
        await this.descontarCreditos({
          usuario:
            validacion.usuario,
          cantidad: costo
        });

      sails.log.info(
        '🤖 IA DemoFlow: Solicitud iniciada.',
        {
          referencia,
          usuario:
            usuarioNumero,
          proyecto:
            proyectoId || null,
          herramienta:
            herramientaFinal,
          costo,
          saldo:
            descuento.saldo
        }
      );

      const resultado =
        await this.solicitarOpenAI({
          instrucciones:
            this.construirInstrucciones({
              herramienta:
                herramientaFinal,
              contexto
            }),

          entrada:
            entradaFinal,

          modelo,

          maxOutputTokens
        });

      await this.registrarHistorial({
        usuario:
          usuarioNumero,
        proyecto:
          proyectoId,
        herramienta:
          herramientaFinal,
        referencia,
        costo,
        saldoAnterior:
          descuento.saldoAnterior,
        saldoFinal:
          descuento.saldo,
        estado:
          'completado',
        modelo:
          resultado.modelo,
        respuestaId:
          resultado.id,
        usage:
          resultado.usage
      });

      sails.log.info(
        '✅ IA DemoFlow: Solicitud completada.',
        {
          referencia,
          usuario:
            usuarioNumero,
          proyecto:
            proyectoId || null,
          herramienta:
            herramientaFinal,
          costo,
          saldo:
            descuento.saldo,
          modelo:
            resultado.modelo,
          tokens:
            resultado.usage &&
            resultado.usage.total_tokens
              ? resultado.usage
                  .total_tokens
              : null
        }
      );

      return {
        ok: true,
        referencia,
        herramienta:
          herramientaFinal,
        respuesta:
          resultado.texto,
        texto:
          resultado.texto,
        costo,
        saldoAnterior:
          descuento.saldoAnterior,
        saldo:
          descuento.saldo,
        modelo:
          resultado.modelo,
        respuestaId:
          resultado.id,
        usage:
          resultado.usage
      };
    } catch (error) {
      let devolucion = null;

      /*
       * Si la API falla después de descontar,
       * devolvemos automáticamente los créditos.
       */
      if (descuento) {
        devolucion =
          await this.devolverCreditos({
            usuarioId:
              usuarioNumero,
            cantidad:
              descuento.descontados
          });
      }

      await this.registrarHistorial({
        usuario:
          usuarioNumero,
        proyecto:
          proyectoId,
        herramienta:
          herramientaFinal,
        referencia,
        costo:
          descuento
            ? descuento.descontados
            : 0,
        saldoAnterior:
          descuento
            ? descuento.saldoAnterior
            : null,
        saldoFinal:
          devolucion &&
          devolucion.ok
            ? devolucion.saldo
            : (
                descuento
                  ? descuento.saldo
                  : null
              ),
        estado: 'error',
        error
      });

      sails.log.error(
        '❌ IA DemoFlow: Error procesando solicitud.',
        {
          referencia,
          usuario:
            usuarioNumero,
          herramienta:
            herramientaFinal,
          codigo:
            error.code || null,
          mensaje:
            error.message,
          creditosDevueltos:
            devolucion &&
            devolucion.ok
              ? devolucion.devueltos
              : 0
        }
      );

      throw error;
    } finally {
      this._usuariosEnProceso.delete(
        usuarioNumero
      );
    }
  },

  // =========================================
  // HERRAMIENTAS ESPECIALIZADAS
  // =========================================

  chat: async function ({
    usuarioId,
    mensaje,
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta: 'chat',
      entrada: mensaje,
      contexto
    });
  },

  analizarProyecto: async function ({
    usuarioId,
    proyectoId = null,
    contenido,
    contexto = ''
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'analizar_proyecto',

      contexto,

      entrada: `
Analiza el siguiente proyecto.

Entrega la respuesta organizada en:

1. Resumen del proyecto.
2. Tecnologías detectadas.
3. Fortalezas.
4. Problemas encontrados.
5. Riesgos de seguridad.
6. Rendimiento.
7. SEO y accesibilidad.
8. Preparación para deploy.
9. Potencial comercial.
10. Recomendaciones prioritarias.

CONTENIDO DEL PROYECTO:
${contenido}
      `.trim()
    });
  },

  explicarError: async function ({
    usuarioId,
    error,
    codigo = '',
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'explicar_error',

      contexto,

      entrada: `
Explica este error de programación.

Entrega:

1. Qué significa.
2. Causa más probable.
3. Archivos que deben revisarse.
4. Solución paso a paso.
5. Código corregido cuando sea posible.
6. Forma de evitar que vuelva a ocurrir.

ERROR:
${error}

CÓDIGO O LOG RELACIONADO:
${codigo || 'No suministrado.'}
      `.trim()
    });
  },

  optimizarCodigo: async function ({
    usuarioId,
    codigo,
    lenguaje = 'JavaScript',
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'optimizar_codigo',

      contexto,

      entrada: `
Optimiza el siguiente código ${lenguaje}.

Requisitos:

1. Conserva su funcionamiento.
2. Mejora claridad y mantenimiento.
3. Corrige errores reales.
4. Mejora seguridad.
5. Evita dependencias innecesarias.
6. Devuelve el archivo completo corregido.
7. Explica brevemente los cambios importantes.

CÓDIGO:
${codigo}
      `.trim()
    });
  },

  revisarSeguridad: async function ({
    usuarioId,
    contenido,
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'revisar_seguridad',

      contexto,

      entrada: `
Realiza una revisión defensiva de seguridad del siguiente proyecto o código.

Entrega:

1. Riesgos críticos.
2. Riesgos altos.
3. Riesgos medios.
4. Riesgos bajos.
5. Secretos expuestos.
6. Problemas de autenticación y autorización.
7. Problemas de validación de datos.
8. Dependencias o configuraciones riesgosas.
9. Correcciones recomendadas.
10. Lista final de prioridades.

No proporciones instrucciones para atacar sistemas.

CONTENIDO:
${contenido}
      `.trim()
    });
  },

  generarReadme: async function ({
    usuarioId,
    contenido,
    nombreProyecto = 'Proyecto DemoFlow',
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'generar_readme',

      contexto,

      entrada: `
Genera un README.md profesional para el proyecto "${nombreProyecto}".

Debe incluir, cuando corresponda:

- Descripción.
- Características.
- Tecnologías.
- Requisitos.
- Instalación.
- Variables de entorno.
- Ejecución local.
- Deploy.
- Estructura del proyecto.
- Seguridad.
- Autor y licencia.

Devuelve solamente el contenido completo del README en Markdown.

INFORMACIÓN DEL PROYECTO:
${contenido}
      `.trim()
    });
  },

  generarDocumentacion:
  async function ({
    usuarioId,
    contenido,
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'generar_documentacion',

      contexto,

      entrada: `
Genera documentación técnica profesional para el siguiente proyecto.

Incluye:

1. Objetivo.
2. Arquitectura.
3. Componentes principales.
4. Modelos de datos.
5. Servicios.
6. Controladores.
7. Rutas.
8. Variables de entorno.
9. Flujos principales.
10. Instalación y despliegue.
11. Mantenimiento.
12. Seguridad.

CONTENIDO:
${contenido}
      `.trim()
    });
  },

  analizarSEO: async function ({
    usuarioId,
    contenido,
    url = '',
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'analizar_seo',

      contexto,

      entrada: `
Analiza el SEO técnico y de contenido.

URL:
${url || 'No suministrada.'}

CONTENIDO:
${contenido}

Entrega:

1. Diagnóstico general.
2. Título y descripción.
3. Encabezados.
4. Contenido.
5. Enlaces.
6. Imágenes.
7. Datos estructurados.
8. Rendimiento.
9. Accesibilidad.
10. Cambios prioritarios.
      `.trim()
    });
  },

  analizarPotencialComercial:
  async function ({
    usuarioId,
    contenido,
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'analizar_potencial_comercial',

      contexto,

      entrada: `
Analiza el potencial comercial de este proyecto.

Entrega:

1. Problema que resuelve.
2. Cliente ideal.
3. Propuesta de valor.
4. Competencia probable.
5. Formas de monetización.
6. Precio sugerido.
7. Fortalezas comerciales.
8. Debilidades.
9. Requisitos para venderlo.
10. Próximos pasos.

PROYECTO:
${contenido}
      `.trim()
    });
  },

  traducirProyecto: async function ({
    usuarioId,
    contenido,
    idiomaDestino = 'inglés',
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'traducir_proyecto',

      contexto,

      entrada: `
Traduce el siguiente contenido al ${idiomaDestino}.

Reglas:

1. Conserva etiquetas HTML, EJS y código.
2. Traduce únicamente textos visibles y documentación.
3. No cambies nombres de variables.
4. No cambies rutas.
5. No cambies identificadores.
6. Devuelve el contenido completo traducido.

CONTENIDO:
${contenido}
      `.trim()
    });
  },

  analizarArquitectura:
  async function ({
    usuarioId,
    contenido,
    contexto = '',
    proyectoId = null
  }) {
    return await this.ejecutar({
      usuarioId,
      proyectoId,
      herramienta:
        'analizar_arquitectura',

      contexto,

      entrada: `
Analiza la arquitectura del siguiente proyecto.

Entrega:

1. Arquitectura actual.
2. Separación de responsabilidades.
3. Flujo de datos.
4. Escalabilidad.
5. Mantenibilidad.
6. Seguridad.
7. Problemas estructurales.
8. Arquitectura recomendada.
9. Plan de migración por etapas.
10. Prioridades.

CONTENIDO:
${contenido}
      `.trim()
    });
  },

  // =========================================
  // ESTADO DEL SERVICIO
  // =========================================

  estado: function () {
    const configurada =
      Boolean(
        this.normalizarTexto(
          process.env.OPENAI_API_KEY
        )
      );

    return {
      ok: configurada,
      servicio: this.nombre,
      configurada,
      modelo: this.modelo,
      apiUrl: this.apiUrl,
      timeoutMs: this.timeoutMs,
      maxOutputTokens:
        this.maxOutputTokens,
      herramientas:
        Object.keys(this.costos),
      costos: {
        ...this.costos
      }
    };
  }

};