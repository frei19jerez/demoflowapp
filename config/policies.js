/**
 * Security Settings
 * (sails.config.security)
 *
 * Configuración temporal de seguridad DemoFlowApp.
 *
 * CSRF permanecerá desactivado mientras actualizamos
 * todos los formularios POST de la plataforma.
 */

module.exports.security = {

  PerfilController: {
  miPerfil: 'isAuthenticated',
  editar: 'isAuthenticated',
  actualizar: 'isAuthenticated',
  publico: true
},

  // =========================================
  // CORS
  // =========================================

  cors: {
    allRoutes: false,
    allowOrigins: '*',
    allowCredentials: false
  },

  // =========================================
  // CSRF
  // =========================================

  /*
   * Temporalmente desactivado.
   *
   * Más adelante lo activaremos y agregaremos el
   * token _csrf a login, registro, pagos, proyectos,
   * deploys y demás formularios POST.
   *
   * El webhook de Wompi seguirá protegido mediante
   * la firma criptográfica del evento.
   */

  csrf: false

};