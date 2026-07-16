/**
 * WebhookController.js
 *
 * Controlador público para recibir eventos
 * enviados por pasarelas de pago.
 *
 * Pasarelas compatibles:
 * - Wompi
 * - PayPal
 */

module.exports = {

  // =========================================
  // WEBHOOK WOMPI
  // =========================================

  wompi: async function (req, res) {

    try {

      const evento = req.body;

      const checksumHeader =
        req.headers['x-event-checksum'] ||
        req.headers['X-Event-Checksum'] ||
        null;

      const resultado =
        await WebhookService.procesarWompi({
          evento,
          checksumHeader
        });

      /*
       * Wompi necesita recibir HTTP 200 cuando el
       * evento fue recibido y procesado correctamente.
       */

      return res.status(200).json({
        ok: true,
        recibido: true,

        procesado:
          resultado.procesado === true,

        estado:
          resultado.estado || null,

        mensaje:
          resultado.mensaje ||
          'Evento recibido correctamente.'
      });

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error procesando webhook de Wompi.'
      );

      sails.log.error(err);

      /*
       * Una firma incorrecta no debe responder 200,
       * porque el evento no puede considerarse confiable.
       */

      if (err.codigo === 'FIRMA_INVALIDA') {

        return res.status(401).json({
          ok: false,
          recibido: false,
          error:
            'Firma de Wompi inválida.'
        });

      }

      /*
       * Cuando no se encuentra el pago, respondemos 404.
       * Wompi podrá volver a intentar el evento.
       */

      if (err.codigo === 'PAGO_NO_ENCONTRADO') {

        return res.status(404).json({
          ok: false,
          recibido: false,
          error:
            'Pago asociado no encontrado.'
        });

      }

      return res.status(400).json({
        ok: false,
        recibido: false,

        error:
          err.message ||
          'No fue posible procesar el evento.'
      });

    }

  },

  // =========================================
  // WEBHOOK PAYPAL
  // =========================================

  paypal: async function (req, res) {

    try {

      const evento = req.body;

      if (
        !evento ||
        typeof evento !== 'object'
      ) {

        return res.status(400).json({
          ok: false,
          recibido: false,
          error:
            'El cuerpo del webhook PayPal no es válido.'
        });

      }

      /*
       * Verificar la firma del evento directamente
       * mediante la API oficial de PayPal.
       */

      const verificacion =
        await PaypalService.verificarWebhook({
          headers: req.headers,
          evento
        });

      if (
        !verificacion ||
        verificacion.verificada !== true
      ) {

        sails.log.warn(
          '⚠️ IA DemoFlow: Webhook PayPal rechazado por firma inválida.',
          {
            eventoId:
              evento.id || null,

            tipo:
              evento.event_type || null
          }
        );

        return res.status(401).json({
          ok: false,
          recibido: false,
          error:
            'Firma de PayPal inválida.'
        });

      }

      const datos =
        PaypalService.extraerDatosWebhook(
          evento
        );

      const tipoEvento =
        String(
          datos.tipo || ''
        ).toUpperCase();

      sails.log.info(
        '🟡 IA DemoFlow: Webhook PayPal verificado.',
        {
          eventoId:
            evento.id || null,

          tipo:
            tipoEvento,

          ordenId:
            datos.ordenId || null,

          capturaId:
            datos.capturaId || null,

          referencia:
            datos.referencia || null,

          customId:
            datos.customId || null
        }
      );

      /*
       * Solo algunos eventos modifican pagos.
       *
       * Los demás eventos válidos se reconocen
       * con HTTP 200 para que PayPal no los reintente.
       */

      const eventosProcesables = [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'PAYMENT.CAPTURE.PENDING',
        'PAYMENT.CAPTURE.REFUNDED',
        'PAYMENT.CAPTURE.REVERSED',
        'CHECKOUT.ORDER.APPROVED',
        'CHECKOUT.ORDER.COMPLETED'
      ];

      if (
        !eventosProcesables.includes(
          tipoEvento
        )
      ) {

        return res.status(200).json({
          ok: true,
          recibido: true,
          procesado: false,
          ignorado: true,
          tipo: tipoEvento,

          mensaje:
            'Evento PayPal verificado, pero no requiere modificar un pago.'
        });

      }

      /*
       * Buscar primero por custom_id, que contiene
       * el ID local del pago cuando la orden fue
       * creada por PaypalService.
       */

      let pago = null;

      const pagoId =
        Number(datos.customId);

      if (
        Number.isSafeInteger(pagoId) &&
        pagoId > 0
      ) {

        pago = await Pago.findOne({
          id: pagoId
        });

      }

      /*
       * Si no se encontró mediante custom_id,
       * buscar por la referencia de DemoFlow.
       */

      if (
        !pago &&
        datos.referencia
      ) {

        pago = await Pago.findOne({
          referencia:
            String(
              datos.referencia
            ).trim()
        });

      }

      /*
       * Algunos eventos de captura pueden traer
       * invoice_id y custom_id dentro del recurso,
       * pero no siempre reference_id.
       *
       * Si todavía no hay pago y existe ordenId,
       * consultamos la orden directamente en PayPal.
       */

      let ordenPaypal = null;

      if (
        !pago &&
        datos.ordenId
      ) {

        try {

          const consultaOrden =
            await PaypalService.consultarOrden(
              datos.ordenId
            );

          ordenPaypal =
            consultaOrden.orden || null;

          const unidad =
            ordenPaypal &&
            Array.isArray(
              ordenPaypal.purchase_units
            )
              ? ordenPaypal.purchase_units[0]
              : null;

          const customIdOrden =
            unidad &&
            unidad.custom_id
              ? Number(unidad.custom_id)
              : null;

          const referenciaOrden =
            unidad
              ? (
                  unidad.reference_id ||
                  unidad.invoice_id ||
                  null
                )
              : null;

          if (
            Number.isSafeInteger(
              customIdOrden
            ) &&
            customIdOrden > 0
          ) {

            pago = await Pago.findOne({
              id: customIdOrden
            });

          }

          if (
            !pago &&
            referenciaOrden
          ) {

            pago = await Pago.findOne({
              referencia:
                String(
                  referenciaOrden
                ).trim()
            });

          }

        } catch (errorConsulta) {

          sails.log.warn(
            '⚠️ IA DemoFlow: No fue posible consultar la orden PayPal desde el webhook.',
            {
              ordenId:
                datos.ordenId,

              error:
                errorConsulta.message
            }
          );

        }

      }

      if (!pago) {

        sails.log.error(
          '❌ IA DemoFlow: Webhook PayPal sin pago local asociado.',
          {
            eventoId:
              evento.id || null,

            tipo:
              tipoEvento,

            referencia:
              datos.referencia || null,

            customId:
              datos.customId || null,

            ordenId:
              datos.ordenId || null,

            capturaId:
              datos.capturaId || null
          }
        );

        /*
         * Respondemos 404 para indicar que el evento
         * no pudo asociarse todavía. PayPal puede
         * intentar enviarlo nuevamente.
         */

        return res.status(404).json({
          ok: false,
          recibido: true,
          procesado: false,
          error:
            'No se encontró el pago asociado al evento PayPal.'
        });

      }

      if (pago.metodo !== 'paypal') {

        sails.log.error(
          '❌ IA DemoFlow: Webhook PayPal asociado a un pago con otro método.',
          {
            pago:
              pago.id,

            metodo:
              pago.metodo,

            eventoId:
              evento.id || null
          }
        );

        return res.status(409).json({
          ok: false,
          recibido: true,
          procesado: false,
          error:
            'El pago encontrado no pertenece a PayPal.'
        });

      }

      // =========================================
      // PAGO COMPLETADO
      // =========================================

      if (
        tipoEvento ===
          'PAYMENT.CAPTURE.COMPLETED' ||
        tipoEvento ===
          'CHECKOUT.ORDER.COMPLETED'
      ) {

        let valorRecibido =
          datos.valor;

        let monedaRecibida =
          datos.moneda;

        /*
         * Si el evento no trae monto suficiente,
         * usar la orden consultada.
         */

        if (
          (
            !valorRecibido ||
            !monedaRecibida
          ) &&
          !ordenPaypal &&
          datos.ordenId
        ) {

          try {

            const consultaOrden =
              await PaypalService.consultarOrden(
                datos.ordenId
              );

            ordenPaypal =
              consultaOrden.orden || null;

          } catch (errorConsulta) {

            sails.log.warn(
              '⚠️ IA DemoFlow: No fue posible consultar el valor de la orden PayPal.',
              {
                ordenId:
                  datos.ordenId,

                error:
                  errorConsulta.message
              }
            );

          }

        }

        if (
          ordenPaypal &&
          Array.isArray(
            ordenPaypal.purchase_units
          )
        ) {

          const unidad =
            ordenPaypal.purchase_units[0];

          if (
            unidad &&
            unidad.amount
          ) {

            valorRecibido =
              valorRecibido ||
              unidad.amount.value;

            monedaRecibida =
              monedaRecibida ||
              unidad.amount.currency_code;

          }

          const captura =
            PaypalService.extraerCaptura(
              ordenPaypal
            );

          if (
            captura &&
            captura.amount
          ) {

            valorRecibido =
              captura.amount.value ||
              valorRecibido;

            monedaRecibida =
              captura.amount.currency_code ||
              monedaRecibida;

          }

        }

        const esperado =
          PaypalService.obtenerDatosMonetarios(
            pago
          );

        const monedaEsperada =
          PaypalService.normalizarMoneda(
            esperado.moneda
          );

        const valorEsperado =
          Number(
            PaypalService.formatearValor(
              esperado.valor,
              monedaEsperada
            )
          );

        const monedaFinal =
          String(
            monedaRecibida || ''
          )
            .trim()
            .toUpperCase();

        const valorFinal =
          Number(valorRecibido);

        if (
          monedaFinal !==
          monedaEsperada
        ) {

          sails.log.error(
            '❌ IA DemoFlow: Moneda PayPal no coincide.',
            {
              pago:
                pago.id,

              esperada:
                monedaEsperada,

              recibida:
                monedaFinal
            }
          );

          return res.status(409).json({
            ok: false,
            recibido: true,
            procesado: false,
            error:
              'La moneda recibida de PayPal no coincide con el plan.'
          });

        }

        if (
          !Number.isFinite(
            valorFinal
          ) ||
          Number(
            valorFinal.toFixed(2)
          ) !==
            Number(
              valorEsperado.toFixed(2)
            )
        ) {

          sails.log.error(
            '❌ IA DemoFlow: Valor PayPal no coincide.',
            {
              pago:
                pago.id,

              esperado:
                valorEsperado,

              recibido:
                valorFinal,

              moneda:
                monedaFinal
            }
          );

          return res.status(409).json({
            ok: false,
            recibido: true,
            procesado: false,
            error:
              'El valor recibido de PayPal no coincide con el plan.'
          });

        }

        /*
         * PagoService.aprobarPago() es idempotente:
         * si el pago ya estaba aprobado, no vuelve
         * a entregar créditos ni duplicar beneficios.
         */

        const resultado =
          await PagoService.aprobarPago(
            pago.id
          );

        sails.log.info(
          '✅ IA DemoFlow: Webhook PayPal aprobó el pago.',
          {
            pago:
              pago.id,

            referencia:
              pago.referencia,

            eventoId:
              evento.id || null,

            ordenId:
              datos.ordenId || null,

            capturaId:
              datos.capturaId || null,

            valor:
              valorFinal,

            moneda:
              monedaFinal
          }
        );

        return res.status(200).json({
          ok: true,
          recibido: true,
          procesado: true,
          estado:
            'aprobado',

          pago:
            resultado.pago.id,

          mensaje:
            'Pago PayPal aprobado y beneficios activados.'
        });

      }

      // =========================================
      // PAGO DENEGADO O REVERTIDO
      // =========================================

      if (
        tipoEvento ===
          'PAYMENT.CAPTURE.DENIED' ||
        tipoEvento ===
          'PAYMENT.CAPTURE.REVERSED'
      ) {

        /*
         * Nunca revertimos automáticamente un pago
         * que ya quedó aprobado. Una reversión debe
         * revisarse en el panel financiero.
         */

        if (
          pago.estado === 'aprobado'
        ) {

          sails.log.warn(
            '⚠️ IA DemoFlow: PayPal notificó reversión de un pago aprobado.',
            {
              pago:
                pago.id,

              tipo:
                tipoEvento,

              eventoId:
                evento.id || null,

              capturaId:
                datos.capturaId || null
            }
          );

          return res.status(200).json({
            ok: true,
            recibido: true,
            procesado: false,
            revisionManual: true,
            estado:
              pago.estado,

            mensaje:
              'El pago ya estaba aprobado. La reversión requiere revisión administrativa.'
          });

        }

        const resultado =
          await PagoService.rechazarPago(
            pago.id
          );

        sails.log.info(
          '❌ IA DemoFlow: Webhook PayPal rechazó el pago.',
          {
            pago:
              pago.id,

            tipo:
              tipoEvento,

            eventoId:
              evento.id || null
          }
        );

        return res.status(200).json({
          ok: true,
          recibido: true,
          procesado: true,
          estado:
            'rechazado',

          pago:
            resultado.pago.id,

          mensaje:
            'Pago PayPal marcado como rechazado.'
        });

      }

      // =========================================
      // PAGO PENDIENTE
      // =========================================

      if (
        tipoEvento ===
          'PAYMENT.CAPTURE.PENDING' ||
        tipoEvento ===
          'CHECKOUT.ORDER.APPROVED'
      ) {

        sails.log.info(
          '⏳ IA DemoFlow: PayPal notificó pago pendiente.',
          {
            pago:
              pago.id,

            tipo:
              tipoEvento,

            eventoId:
              evento.id || null,

            ordenId:
              datos.ordenId || null
          }
        );

        return res.status(200).json({
          ok: true,
          recibido: true,
          procesado: false,
          pendiente: true,
          estado:
            'pendiente',

          pago:
            pago.id,

          mensaje:
            'La transacción PayPal todavía está pendiente.'
        });

      }

      // =========================================
      // REEMBOLSO
      // =========================================

      if (
        tipoEvento ===
          'PAYMENT.CAPTURE.REFUNDED'
      ) {

        /*
         * El pago original no se cambia automáticamente
         * a rechazado porque sí fue aprobado y cobrado.
         *
         * Más adelante este evento alimentará el panel
         * financiero y el módulo de reembolsos.
         */

        sails.log.warn(
          '↩️ IA DemoFlow: PayPal notificó un reembolso.',
          {
            pago:
              pago.id,

            eventoId:
              evento.id || null,

            capturaId:
              datos.capturaId || null
          }
        );

        return res.status(200).json({
          ok: true,
          recibido: true,
          procesado: false,
          reembolsado: true,
          revisionManual: true,
          estado:
            pago.estado,

          pago:
            pago.id,

          mensaje:
            'Reembolso PayPal recibido. Requiere actualización financiera y revisión de la suscripción.'
        });

      }

      return res.status(200).json({
        ok: true,
        recibido: true,
        procesado: false,
        tipo:
          tipoEvento,

        mensaje:
          'Evento PayPal recibido correctamente.'
      });

    } catch (err) {

      sails.log.error(
        '❌ IA DemoFlow: Error procesando webhook de PayPal.'
      );

      sails.log.error(err);

      /*
       * Las firmas inválidas o cabeceras incompletas
       * reciben 401.
       */

      const mensaje =
        String(
          err.message || ''
        ).toLowerCase();

      if (
        mensaje.includes('firma') ||
        mensaje.includes('cabeceras') ||
        mensaje.includes('webhook id')
      ) {

        return res.status(401).json({
          ok: false,
          recibido: false,
          error:
            err.message ||
            'No fue posible verificar el webhook PayPal.'
        });

      }

      /*
       * Errores temporales o de API reciben 500 para
       * permitir que PayPal reintente el evento.
       */

      return res.status(500).json({
        ok: false,
        recibido: true,
        procesado: false,

        error:
          err.message ||
          'No fue posible procesar el webhook PayPal.'
      });

    }

  }

};