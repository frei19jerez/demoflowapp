/**
 * Datastores
 * (sails.config.datastores)
 *
 * Configuration de bases de datos para DemoFlow
 */

module.exports.datastores = {

  default: {

    /***************************************************************************
    *                                                                          *
    * 🔥 TEMPORAL PARA DEMOFLOW RUNTIME                                        *
    *                                                                          *
    * Usamos sails-disk mientras probamos                                     *
    * despliegues automáticos de apps hijas.                                   *
    *                                                                          *
    * Luego volveremos a PostgreSQL real.                                      *
    *                                                                          *
    ***************************************************************************/

    adapter: 'sails-disk'

  }

};