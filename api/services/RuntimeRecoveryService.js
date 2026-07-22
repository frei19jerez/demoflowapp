/**
 * RuntimeRecoveryService.js
 * Recupera runtimes activos después de reinicios de Render
 */

module.exports = {

  recuperarRuntimes: async function () {
    try {
      sails.log.info('🤖 IA DemoFlow: Iniciando recuperación de runtimes...');

      const proyectos = await Proyecto.find({
        activo: true,
        deployType: 'dynamic'
      });

      if (!proyectos || proyectos.length === 0) {
        sails.log.info(
          '🤖 IA DemoFlow: No hay runtimes dinámicos para recuperar.'
        );
        return;
      }

      for (const proyecto of proyectos) {
        if (!proyecto.carpetaRuntime || !proyecto.puerto) {
          continue;
        }

        sails.log.info('🔄 IA DemoFlow: Recuperando runtime:', {
          nombre: proyecto.nombre,
          slug: proyecto.carpetaRuntime,
          puerto: proyecto.puerto,
          proyectoId: proyecto.id,
          tieneDatabaseUrl: !!(
            proyecto.databaseUrl ||
            proyecto.database_url
          )
        });

        try {
          await DeployService.reiniciarRuntime(
            proyecto.carpetaRuntime,
            proyecto.puerto,
            proyecto
          );
        } catch (errorRuntime) {
          sails.log.warn(
            '⚠️ IA DemoFlow: No se pudo recuperar runtime:',
            proyecto.slug || proyecto.carpetaRuntime
          );

          sails.log.warn(
            errorRuntime && errorRuntime.message
              ? errorRuntime.message
              : errorRuntime
          );
        }
      }

      sails.log.info(
        '✅ IA DemoFlow: Recuperación de runtimes finalizada.'
      );

    } catch (error) {
      sails.log.error(
        '❌ IA DemoFlow: Error general recuperando runtimes.'
      );

      sails.log.error(error);
    }
  }

};