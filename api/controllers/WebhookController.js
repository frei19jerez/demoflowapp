/**
 * WebhookController.js
 *
 * Controlador público para recibir eventos
 * enviados por pasarelas de pago.
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
  }

};