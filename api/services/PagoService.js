/**

* PagoService.js
* Servicio central de pagos DemoFlow IA
*
* Responsabilidades:
* * Crear pagos locales.
* * Normalizar métodos de pago.
* * Generar referencias únicas.
* * Construir rutas de checkout.
* * Aprobar y rechazar pagos.
* * Activar Premium, suscripción y créditos IA.
* * Registrar información del proveedor.
* * Evitar aprobaciones y beneficios duplicados.
*
* Compatible con:
* * Sails.js 1.x
* * Node.js 20+
* * PostgreSQL
    */

'use strict';

const crypto = require('crypto');

module.exports = {

/*

* Bloqueo temporal dentro del proceso Node.
*
* Ayuda a evitar que el retorno y el webhook
* procesen simultáneamente el mismo pago.
*
* La protección principal sigue siendo:
* * Estado del pago.
* * Suscripción asociada al pago.
* * Identificadores únicos del proveedor.
    */
    _pagosEnProceso: new Set(),

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

normalizarEstado: function (estado) {
  return this.normalizarTexto(
    estado || 'pendiente'
  ).toLowerCase();
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

/**
 * Filtra datos antes de enviarlos a Waterline.
 *
 * Esto permite utilizar campos opcionales
 * cuando ya existen en el modelo Pago sin
 * romper instalaciones que aún no los tengan.
 */
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
        Object.prototype.hasOwnProperty.call(
          modelo.attributes,
          campo
        ) &&
        typeof datos[campo] !== 'undefined'
      ) {
        resultado[campo] =
          datos[campo];
      }
    }
  );

  return resultado;
},


// =========================================
// CREAR REFERENCIA
// =========================================

crearReferencia: function () {
  const fecha = Date.now();

  const aleatorio = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `DF-${fecha}-${aleatorio}`;
},

// =========================================
// NORMALIZAR MÉTODO
// =========================================

normalizarMetodo: function (
  metodo = 'manual'
) {
  const limpio = String(
    metodo || 'manual'
  )
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (
    limpio === 'wompi' ||
    limpio === 'visa' ||
    limpio === 'mastercard' ||
    limpio === 'pse'
  ) {
    return 'wompi';
  }

  if (
    limpio === 'bogota' ||
    limpio === 'banco_bogota' ||
    limpio === 'banco_de_bogota'
  ) {
    return 'banco_bogota';
  }

  if (limpio === 'paypal') {
    return 'paypal';
  }

  if (limpio === 'nequi') {
    return 'nequi';
  }

  if (limpio === 'bbva') {
    return 'bbva';
  }

  if (limpio === 'manual') {
    return 'manual';
  }

  return 'manual';
},

// =========================================
// VALIDAR PLAN
// =========================================

obtenerPlan: function (plan) {
  const codigo = this.normalizarTexto(
    plan || 'pro'
  ).toLowerCase();

  const datosPlan =
    PlanService.obtener(codigo);

  if (!datosPlan) {
    throw new Error(
      `El plan ${codigo} no existe.`
    );
  }

  if (!datosPlan.codigo) {
    throw new Error(
      'PlanService devolvió un plan sin código.'
    );
  }

  return datosPlan;
},

// =========================================
// CREAR PAGO
// =========================================

crearPago: async function ({
  usuario,
  metodo = 'manual',
  plan = 'pro',
  valor
}) {
  const usuarioId =
    Number(usuario);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0
  ) {
    throw new Error(
      'Usuario requerido para crear el pago.'
    );
  }

  const usuarioExiste =
    await Usuario.findOne({
      id: usuarioId
    });

  if (!usuarioExiste) {
    throw new Error(
      'El usuario indicado no existe.'
    );
  }

  const metodoFinal =
    this.normalizarMetodo(metodo);

  const datosPlan =
    this.obtenerPlan(plan);

  const valorPlan =
    this.numeroSeguro(
      datosPlan.valor ??
      datosPlan.precio,
      0
    );

  const valorFinal =
    typeof valor !== 'undefined' &&
    valor !== null &&
    valor !== ''
      ? this.numeroSeguro(valor, 0)
      : valorPlan;

  if (
    !Number.isFinite(valorFinal) ||
    valorFinal <= 0
  ) {
    throw new Error(
      'El valor del pago debe ser mayor que cero.'
    );
  }

  const creditos =
    Math.max(
      0,
      Math.trunc(
        this.numeroSeguro(
          datosPlan.creditos,
          0
        )
      )
    );

  const moneda =
    this.normalizarTexto(
      datosPlan.moneda ||
      'COP'
    ).toUpperCase();

  const referencia =
    this.crearReferencia();

  const datosPago = {
    usuario: usuarioId,
    metodo: metodoFinal,
    plan: datosPlan.codigo,
    valor: valorFinal,
    moneda,
    creditos,
    referencia,
    estado: 'pendiente'
  };

  const pago =
    await Pago.create(
      datosPago
    ).fetch();

  if (!pago || !pago.id) {
    throw new Error(
      'No fue posible crear el pago local.'
    );
  }

  /*
   * Aquí no se crea todavía la orden PayPal
   * ni el checkout de Wompi.
   *
   * El controlador redirige primero a:
   * /pago/:id/paypal
   * /pago/:id/wompi
   *
   * Después, el método correspondiente
   * prepara el checkout una sola vez.
   */
  const instrucciones =
    await this.obtenerInstrucciones(
      pago,
      {
        prepararCheckout: false
      }
    );

  const url =
    this.obtenerUrlPago({
      metodo: metodoFinal,
      pago
    });

  sails.log.info(
    '💳 IA DemoFlow: Pago creado.',
    {
      id: pago.id,
      usuario: usuarioId,
      metodo: metodoFinal,
      plan: datosPlan.codigo,
      valor: valorFinal,
      moneda,
      creditos,
      referencia,
      url
    },
  );

  return {
    ok: true,
    pago,
    referencia,
    plan: datosPlan,
    instrucciones,
    url,
    mensaje:
      'Pago creado correctamente.'
  };
},

// =========================================
// URL SEGÚN MÉTODO
// =========================================

obtenerUrlPago: function ({
  metodo,
  pago
}) {
  if (!pago || !pago.id) {
    throw new Error(
      'Se requiere un pago válido para obtener la URL.'
    );
  }

  const metodoFinal =
    this.normalizarMetodo(
      metodo || pago.metodo
    );

  if (metodoFinal === 'paypal') {
    return `/pago/${pago.id}/paypal`;
  }

  if (metodoFinal === 'wompi') {
    return `/pago/${pago.id}/wompi`;
  }

  if (metodoFinal === 'nequi') {
    return `/pago/${pago.id}/nequi`;
  }

  if (metodoFinal === 'bbva') {
    return `/pago/${pago.id}/bbva`;
  }

  if (
    metodoFinal ===
    'banco_bogota'
  ) {
    return `/pago/${pago.id}/banco-bogota`;
  }

  return `/pago/${pago.id}`;
},

// =========================================
// OBTENER PAGO
// =========================================

obtenerPago: async function (idPago) {
  const id = Number(idPago);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'Identificador de pago inválido.'
    );
  }

  const pago =
    await Pago.findOne({
      id
    });

  if (!pago) {
    throw new Error(
      'Pago no encontrado.'
    );
  }

  return pago;
},

// =========================================
// OBTENER PAGO POR REFERENCIA
// =========================================

obtenerPorReferencia: async function (
  referencia
) {
  const referenciaFinal =
    this.normalizarTexto(
      referencia
    );

  if (!referenciaFinal) {
    throw new Error(
      'La referencia del pago es obligatoria.'
    );
  }

  const pago =
    await Pago.findOne({
      referencia: referenciaFinal
    });

  if (!pago) {
    throw new Error(
      'Pago no encontrado por referencia.'
    );
  }

  return pago;
},

// =========================================
// OBTENER INSTRUCCIONES
// =========================================

obtenerInstrucciones: async function (
  pago,
  {
    prepararCheckout = false
  } = {}
) {

  if (!pago || !pago.id) {
    throw new Error(
      'Pago requerido para obtener instrucciones.'
    );
  }

  const metodoFinal =
    this.normalizarMetodo(
      pago.metodo
    );

  /*
   * PayPal y Wompi se preparan en sus
   * controladores respectivos.
   *
   * No debemos crear aquí una orden PayPal
   * porque PagoController.paypal ya la crea.
   */
  if (metodoFinal === 'paypal') {

    if (prepararCheckout) {
      return await PaypalService.crearOrden(
        pago
      );
    }

    return {
      ok: true,
      metodo: 'paypal',
      referencia: pago.referencia,
      mensaje:
        'Continúa al checkout seguro de PayPal.'
    };

  }

  if (metodoFinal === 'wompi') {

    return {
      ok: true,
      metodo: 'wompi',
      referencia: pago.referencia,
      mensaje:
        'Continúa al checkout seguro de Wompi.'
    };

  }

  if (metodoFinal === 'nequi') {

    if (
      typeof NequiService !== 'undefined' &&
      NequiService &&
      typeof NequiService.datosPago === 'function'
    ) {
      return await NequiService.datosPago(
        pago
      );
    }

  }

  if (metodoFinal === 'bbva') {

    if (
      typeof BBVAService !== 'undefined' &&
      BBVAService &&
      typeof BBVAService.datosPago === 'function'
    ) {
      return await BBVAService.datosPago(
        pago
      );
    }

  }

  if (metodoFinal === 'banco_bogota') {

    if (
      typeof BancoBogotaService !== 'undefined' &&
      BancoBogotaService &&
      typeof BancoBogotaService.datosPago === 'function'
    ) {
      return await BancoBogotaService.datosPago(
        pago
      );
    }

  }

  return {
    ok: true,
    metodo: metodoFinal,
    referencia: pago.referencia,
    valor: pago.valor,
    moneda: pago.moneda || 'COP',
    mensaje:
      'Pago manual creado. Debe verificarse antes de aprobarlo.'
  };

},

// =========================================
// PREPARAR METADATOS DEL PROVEEDOR
// =========================================

prepararMetadatosProveedor: function (
  metadata = {}
) {
  if (
    !metadata ||
    typeof metadata !== 'object'
  ) {
    return {};
  }

  const proveedor =
    this.normalizarTexto(
      metadata.proveedor
    ).toLowerCase();

  const datos = {
    proveedorPago:
      proveedor || null,

    paypalOrderId:
      this.normalizarTexto(
        metadata.ordenId
      ) || null,

    paypalCaptureId:
      this.normalizarTexto(
        metadata.capturaId
      ) || null,

    paypalPayerId:
      this.normalizarTexto(
        metadata.payerId
      ) || null,

    paypalPayerEmail:
      this.normalizarTexto(
        metadata.payerEmail
      ).toLowerCase() || null,

    paypalPayerNombre:
      this.normalizarTexto(
        metadata.payerNombre
      ) || null,

    paypalEstado:
      this.normalizarTexto(
        metadata.estadoCaptura ||
        metadata.estadoOrden
      ).toUpperCase() || null,

    transaccionId:
      this.normalizarTexto(
        metadata.capturaId ||
        metadata.transaccionId
      ) || null,

    referenciaProveedor:
      this.normalizarTexto(
        metadata.ordenId ||
        metadata.referenciaProveedor
      ) || null,

    monedaProveedor:
      this.normalizarTexto(
        metadata.moneda
      ).toUpperCase() || null,

    valorProveedor:
      typeof metadata.valor !==
      'undefined'
        ? this.numeroSeguro(
            metadata.valor,
            null
          )
        : null,

    fechaTransaccion:
      metadata.fechaCaptura
        ? new Date(
            metadata.fechaCaptura
          )
        : new Date(),

    metadataProveedor:
      JSON.stringify(metadata),

    respuestaProveedor:
      JSON.stringify(metadata)
  };

  return this.filtrarAtributosModelo(
    Pago,
    datos
  );
},

// =========================================
// APROBAR PAGO
// =========================================

aprobarPago: async function (
  idPago,
  metadata = {}
) {
  const id = Number(idPago);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'Identificador de pago inválido.'
    );
  }

  /*
   * Si el retorno PayPal y el webhook llegan
   * al mismo tiempo, evitamos procesar dos veces
   * el mismo pago dentro de este proceso Node.
   */
  if (
    this._pagosEnProceso.has(id)
  ) {
    const pagoEnProceso =
      await this.obtenerPago(id);

    return {
      ok: true,
      pago: pagoEnProceso,
      enProceso: true,
      mensaje:
        'Este pago ya está siendo procesado.'
    };
  }

  this._pagosEnProceso.add(id);

  try {
    const pago =
      await this.obtenerPago(id);

    const estadoActual =
      this.normalizarEstado(
        pago.estado
      );

    if (
      estadoActual ===
      'aprobado'
    ) {
      /*
       * Aunque ya estuviera aprobado, podemos
       * completar metadatos faltantes sin
       * volver a asignar beneficios.
       */
      const metadatos =
        this.prepararMetadatosProveedor(
          metadata
        );

      let pagoFinal = pago;

      if (
        Object.keys(metadatos).length > 0
      ) {
        pagoFinal =
          await Pago.updateOne({
            id
          }).set(
            metadatos
          ) || pago;
      }

      return {
        ok: true,
        pago: pagoFinal,
        yaAprobado: true,
        beneficiosActivados: false,
        mensaje:
          'El pago ya estaba aprobado.'
      };
    }

    if (
      estadoActual ===
      'rechazado'
    ) {
      throw new Error(
        'No se puede aprobar un pago rechazado sin una revisión administrativa.'
      );
    }

    /*
     * Validamos el usuario y el plan antes de
     * modificar el estado financiero.
     */
    const datosPlan =
      this.obtenerPlan(
        pago.plan
      );

    const usuario =
      await Usuario.findOne({
        id: pago.usuario
      });

    if (!usuario) {
      throw new Error(
        'Usuario del pago no encontrado.'
      );
    }

    /*
     * Activar beneficios debe evitar duplicados
     * comprobando si ya existe una suscripción
     * asociada con este pago.
     */
    const beneficios =
      await this.activarBeneficios(
        pago,
        {
          datosPlan,
          usuario,
          metadata
        }
      );

    const datosActualizacion = {
      estado: 'aprobado',
      fechaAprobacion: new Date(),
      ...this.prepararMetadatosProveedor(
        metadata
      )
    };

    /*
     * Solo actualizamos pagos que aún no están
     * aprobados.
     */
    let pagoActualizado =
      await Pago.updateOne({
        id,
        estado: {
          '!=': 'aprobado'
        }
      }).set(
        datosActualizacion
      );

    if (!pagoActualizado) {
      pagoActualizado =
        await this.obtenerPago(id);
    }

    await this.registrarTransaccion({
      pago: pagoActualizado,
      metadata,
      estado: 'aprobado'
    });

    sails.log.info(
      '✅ IA DemoFlow: Pago aprobado.',
      {
        id: pagoActualizado.id,
        usuario: pagoActualizado.usuario,
        plan: pagoActualizado.plan,
        metodo: pagoActualizado.metodo,
        referencia:
          pagoActualizado.referencia,
        proveedor:
          metadata.proveedor ||
          pagoActualizado.metodo,
        transaccion:
          metadata.capturaId ||
          metadata.transaccionId ||
          null,
        beneficios
      }
    );

    return {
      ok: true,
      pago: pagoActualizado,
      beneficios,
      mensaje:
        'Pago aprobado y beneficios activados.'
    };
  } finally {
    this._pagosEnProceso.delete(id);
  }
},

// =========================================
// RECHAZAR PAGO
// =========================================

rechazarPago: async function (
  idPago,
  metadata = {}
) {
  const pago =
    await this.obtenerPago(
      idPago
    );

  const estadoActual =
    this.normalizarEstado(
      pago.estado
    );

  if (
    estadoActual ===
    'aprobado'
  ) {
    throw new Error(
      'No se puede rechazar un pago que ya fue aprobado.'
    );
  }

  if (
    estadoActual ===
    'rechazado'
  ) {
    return {
      ok: true,
      pago,
      mensaje:
        'El pago ya estaba rechazado.'
    };
  }

  const datosActualizacion = {
    estado: 'rechazado',
    ...this.prepararMetadatosProveedor(
      metadata
    )
  };

  if (
    Pago.attributes &&
    Pago.attributes.fechaRechazo
  ) {
    datosActualizacion.fechaRechazo =
      new Date();
  }

  if (
    Pago.attributes &&
    Pago.attributes.motivoRechazo
  ) {
    datosActualizacion.motivoRechazo =
      this.normalizarTexto(
        metadata.motivo ||
        'Pago rechazado'
      );
  }

  const pagoActualizado =
    await Pago.updateOne({
      id: pago.id,
      estado: {
        '!=': 'aprobado'
      }
    }).set(
      this.filtrarAtributosModelo(
        Pago,
        datosActualizacion
      )
    );

  if (!pagoActualizado) {
    const pagoFinal =
      await this.obtenerPago(
        pago.id
      );

    if (
      pagoFinal.estado ===
      'aprobado'
    ) {
      throw new Error(
        'El pago fue aprobado antes de poder rechazarse.'
      );
    }

    return {
      ok: true,
      pago: pagoFinal,
      mensaje:
        'El pago ya había sido procesado.'
    };
  }

  await this.registrarTransaccion({
    pago: pagoActualizado,
    metadata,
    estado: 'rechazado'
  });

  sails.log.info(
    '❌ IA DemoFlow: Pago rechazado.',
    {
      id: pagoActualizado.id,
      usuario:
        pagoActualizado.usuario,
      metodo:
        pagoActualizado.metodo,
      motivo:
        metadata.motivo ||
        null
    }
  );

  return {
    ok: true,
    pago: pagoActualizado,
    mensaje:
      'Pago rechazado correctamente.'
  };
},
// =========================================
// BUSCAR SUSCRIPCIÓN DEL PAGO
// =========================================

buscarSuscripcionPago: async function (pago) {
  if (
    typeof Suscripcion === 'undefined' ||
    !Suscripcion ||
    !Suscripcion.attributes
  ) {
    return null;
  }

  const criterios = {};

  if (Suscripcion.attributes.pago) {
    criterios.pago = pago.id;
  } else if (Suscripcion.attributes.pagoId) {
    criterios.pagoId = pago.id;
  } else {
    return null;
  }

  return await Suscripcion.findOne(
    criterios
  );
},

// =========================================
// ACTIVAR BENEFICIOS
// =========================================

activarBeneficios: async function (
  pago,
  opciones = {}
) {
  if (!pago || !pago.id) {
    throw new Error(
      'Pago requerido para activar beneficios.'
    );
  }

  const datosPlan =
    opciones.datosPlan ||
    this.obtenerPlan(
      pago.plan
    );

  const usuario =
    opciones.usuario ||
    await Usuario.findOne({
      id: pago.usuario
    });

  if (!usuario) {
    throw new Error(
      'Usuario del pago no encontrado.'
    );
  }

  /*
   * Si ya existe una suscripción asociada con
   * este pago, no volvemos a sumar créditos.
   */
  const suscripcionExistente =
    await this.buscarSuscripcionPago(
      pago
    );

  if (suscripcionExistente) {
    sails.log.info(
      'ℹ️ IA DemoFlow: Beneficios del pago ya estaban activados.',
      {
        pago: pago.id,
        usuario: usuario.id,
        suscripcion:
          suscripcionExistente.id
      }
    );

    return {
      ok: true,
      yaActivados: true,
      usuario: usuario.id,
      suscripcion:
        suscripcionExistente,
      creditos:
        Number(usuario.creditos || 0),
      plan:
        usuario.plan ||
        datosPlan.codigo
    };
  }

  const creditosActuales =
    Math.max(
      0,
      this.numeroSeguro(
        usuario.creditos,
        0
      )
    );

  const creditosPago =
    Math.max(
      0,
      Math.trunc(
        this.numeroSeguro(
          pago.creditos ??
          datosPlan.creditos,
          0
        )
      )
    );

  const nuevosCreditos =
    creditosActuales +
    creditosPago;

  let resultadoSuscripcion =
    null;

  if (
    typeof SuscripcionService !==
      'undefined' &&
    SuscripcionService &&
    typeof SuscripcionService.activar ===
      'function'
  ) {
    resultadoSuscripcion =
      await SuscripcionService.activar({
        usuario: usuario.id,
        plan: datosPlan.codigo,
        pago: pago.id
      });
  }

  const datosUsuario = {
    creditos: nuevosCreditos,
    acceso_ia: true,
    plan: datosPlan.codigo
  };

  if (
    Usuario.attributes &&
    Usuario.attributes.premium
  ) {
    datosUsuario.premium = true;
  }

  if (
    Usuario.attributes &&
    Usuario.attributes.esPremium
  ) {
    datosUsuario.esPremium = true;
  }

  if (
    Usuario.attributes &&
    Usuario.attributes.estadoPremium
  ) {
    datosUsuario.estadoPremium =
      'activo';
  }

  const datosUsuarioFinales =
    this.filtrarAtributosModelo(
      Usuario,
      datosUsuario
    );

  const usuarioActualizado =
    await Usuario.updateOne({
      id: usuario.id
    }).set(
      datosUsuarioFinales
    );

  if (!usuarioActualizado) {
    throw new Error(
      'No fue posible actualizar los beneficios del usuario.'
    );
  }

  sails.log.info(
    '⭐ IA DemoFlow: Beneficios Premium activados.',
    {
      pago: pago.id,
      usuario: usuario.id,
      plan: datosPlan.codigo,
      creditosAnteriores:
        creditosActuales,
      creditosAsignados:
        creditosPago,
      creditosTotales:
        nuevosCreditos,
      suscripcion:
        resultadoSuscripcion &&
        resultadoSuscripcion.suscripcion
          ? resultadoSuscripcion
              .suscripcion.id
          : null
    }
  );

  return {
    ok: true,
    yaActivados: false,
    usuario: usuarioActualizado,
    suscripcion:
      resultadoSuscripcion,
    creditosAsignados:
      creditosPago,
    creditos:
      nuevosCreditos,
    plan:
      datosPlan.codigo
  };
},

// =========================================
// REGISTRAR TRANSACCIÓN
// =========================================

registrarTransaccion: async function ({
  pago,
  metadata = {},
  estado = 'aprobado'
}) {
  /*
   * Si el proyecto todavía no tiene un modelo
   * Transaccion, el pago continúa funcionando.
   */
  if (
    typeof Transaccion === 'undefined' ||
    !Transaccion ||
    !Transaccion.attributes
  ) {
    return {
      ok: true,
      omitida: true,
      mensaje:
        'No existe el modelo Transaccion.'
    };
  }

  const proveedor =
    this.normalizarTexto(
      metadata.proveedor ||
      pago.metodo
    ).toLowerCase();

  const identificador =
    this.normalizarTexto(
      metadata.capturaId ||
      metadata.transaccionId ||
      metadata.ordenId ||
      pago.referencia
    );

  /*
   * Evita registrar la misma captura o
   * transacción más de una vez.
   */
  const camposIdentificador = [
    'transaccionId',
    'referenciaProveedor',
    'providerTransactionId',
    'externalId'
  ];

  let campoBusqueda = null;

  for (
    const campo of camposIdentificador
  ) {
    if (
      Transaccion.attributes[campo]
    ) {
      campoBusqueda = campo;
      break;
    }
  }

  if (
    campoBusqueda &&
    identificador
  ) {
    const existente =
      await Transaccion.findOne({
        [campoBusqueda]: identificador
      });

    if (existente) {
      return {
        ok: true,
        yaExistia: true,
        transaccion: existente
      };
    }
  }

  const datos = {
    pago: pago.id,
    usuario: pago.usuario,
    metodo: proveedor,
    proveedor,
    estado,
    referencia: pago.referencia,
    transaccionId: identificador,
    referenciaProveedor:
      identificador,
    providerTransactionId:
      identificador,
    externalId: identificador,
    ordenId:
      metadata.ordenId || null,
    capturaId:
      metadata.capturaId || null,
    valor:
      typeof metadata.valor !==
      'undefined'
        ? metadata.valor
        : pago.valor,
    moneda:
      metadata.moneda ||
      pago.moneda,
    payerId:
      metadata.payerId || null,
    payerEmail:
      metadata.payerEmail || null,
    fecha: new Date(),
    metadata:
      JSON.stringify(metadata),
    datos:
      JSON.stringify(metadata)
  };

  const datosFinales =
    this.filtrarAtributosModelo(
      Transaccion,
      datos
    );

  if (
    Object.keys(datosFinales).length === 0
  ) {
    return {
      ok: true,
      omitida: true,
      mensaje:
        'El modelo Transaccion no tiene campos compatibles.'
    };
  }

  try {
    const transaccion =
      await Transaccion.create(
        datosFinales
      ).fetch();

    return {
      ok: true,
      transaccion
    };
  } catch (error) {
    /*
     * Si existe una restricción UNIQUE y otro
     * proceso ya creó la transacción, se trata
     * como una operación idempotente.
     */
    const codigo =
      String(
        error.code ||
        error.name ||
        ''
      ).toLowerCase();

    if (
      codigo.includes('unique') ||
      codigo.includes('e_unique')
    ) {
      return {
        ok: true,
        yaExistia: true
      };
    }

    throw error;
  }
},

// =========================================
// LISTAR PAGOS DE USUARIO
// =========================================

listarPorUsuario:
async function (usuario) {
const usuarioId =
Number(usuario);

  if (
    !Number.isSafeInteger(
      usuarioId
    ) ||
    usuarioId <= 0
  ) {
    throw new Error(
      'Usuario requerido.'
    );
  }

  return await Pago.find({
    usuario:
      usuarioId
  }).sort(
    'createdAt DESC'
  );
},

// =========================================
// DETECTAR MÉTODO IA
// =========================================

detectarMetodoIA: async function (
  texto = ''
) {
  const contenido = String(
    texto || ''
  )
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );

  if (
    contenido.includes('paypal')
  ) {
    return {
      metodo: 'paypal',
      mensaje:
        'IA DemoFlow detectó pago PayPal.'
    };
  }

  if (
    contenido.includes('wompi') ||
    contenido.includes('pse') ||
    contenido.includes('visa') ||
    contenido.includes('mastercard')
  ) {
    return {
      metodo: 'wompi',
      mensaje:
        'IA DemoFlow detectó pago mediante Wompi.'
    };
  }

  if (
    contenido.includes('nequi')
  ) {
    return {
      metodo: 'nequi',
      mensaje:
        'IA DemoFlow detectó pago Nequi.'
    };
  }

  if (
    contenido.includes('bbva')
  ) {
    return {
      metodo: 'bbva',
      mensaje:
        'IA DemoFlow detectó pago BBVA.'
    };
  }

  if (
    contenido.includes('bogota') ||
    contenido.includes(
      'banco de bogota'
    )
  ) {
    return {
      metodo: 'banco_bogota',
      mensaje:
        'IA DemoFlow detectó Banco de Bogotá.'
    };
  }

  return {
    metodo: 'desconocido',
    mensaje:
      'IA DemoFlow no pudo detectar el método.'
  };
},

// =========================================
// RECOMENDAR PLAN IA
// =========================================

recomendarPlanIA: async function (
  cantidadProyectos = 0
) {
  const proyectos =
    Math.max(
      0,
      Math.trunc(
        this.numeroSeguro(
          cantidadProyectos,
          0
        )
      )
    );

  return await PlanService
    .recomendarPlanIA({
      proyectos
    });
}

};