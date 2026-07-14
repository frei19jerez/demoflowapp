/**
 * Security Settings
 * (sails.config.security)
 *
 * Configuración temporal de seguridad DemoFlowApp.
 */

module.exports.security = {

  // ===============================
  // CORS
  // ===============================

  cors: {
    allRoutes: false,
    allowOrigins: '*',
    allowCredentials: false
  },

  // ===============================
  // CSRF
  // ===============================

  /*
   * Temporalmente desactivado mientras agregamos
   * tokens CSRF a todos los formularios POST.
   */

  csrf: false

};