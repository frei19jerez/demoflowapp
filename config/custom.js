/**
 * Custom configuration
 * (sails.config.custom)
 */

module.exports.custom = {

  /***************************************************************************
   * CONFIGURACIÓN GENERAL
   ***************************************************************************/

  appName: 'DemoFlowApp',

  appUrl:
    process.env.APP_URL ||
    'http://localhost:1337',

  /***************************************************************************
   * WOMPI
   ***************************************************************************/

  wompi: {

    // Llave pública
    publicKey:
      process.env.WOMPI_PUBLIC_KEY || '',

    // Llave privada
    privateKey:
      process.env.WOMPI_PRIVATE_KEY || '',

    // Integrity Secret
    integritySecret:
      process.env.WOMPI_INTEGRITY_SECRET || '',

    // Events Secret (Webhook)
    eventsSecret:
      process.env.WOMPI_EVENTS_SECRET || '',

    // Ambiente
    sandbox:
      process.env.WOMPI_SANDBOX === 'true',

    // API
    apiUrl:
      process.env.WOMPI_API_URL ||
      'https://production.wompi.co/v1'

  },

  /***************************************************************************
   * PAYPAL
   ***************************************************************************/

  paypal: {

    clientId:
      process.env.PAYPAL_CLIENT_ID || '',

    clientSecret:
      process.env.PAYPAL_CLIENT_SECRET || '',

    sandbox:
      process.env.PAYPAL_SANDBOX === 'true'

  },

  /***************************************************************************
   * MERCADO PAGO
   ***************************************************************************/

  mercadoPago: {

    accessToken:
      process.env.MP_ACCESS_TOKEN || ''

  }

};