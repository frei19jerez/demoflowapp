/**
 * RuntimeHealthService.js
 * IA DemoFlow: monitoreo y reinicio automático de runtimes
 */

const { exec } = require('child_process');

function ejecutar(comando) {
  return new Promise((resolve) => {
    exec(comando, { timeout: 60000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        error,
        stdout,
        stderr
      });
    });
  });
}

module.exports = {

  verificarPuerto: async function (puerto) {
    const resultado = await ejecutar(`curl -I http://127.0.0.1:${puerto}`);

    return {
      ok: resultado.ok && resultado.stdout.includes('200'),
      stdout: resultado.stdout,
      stderr: resultado.stderr
    };
  },

  reiniciarPM2: async function (nombrePM2) {
    sails.log.info(`🤖 IA DemoFlow: Reiniciando runtime ${nombrePM2}...`);
    return await ejecutar(`pm2 restart ${nombrePM2}`);
  },

  revisarRuntime: async function (proyecto) {
    try {
      if (!proyecto || !proyecto.puerto) {
        return {
          ok: false,
          mensaje: 'Proyecto sin puerto interno.'
        };
      }

      const puerto = proyecto.puerto;
      const nombrePM2 = proyecto.carpetaDemo || proyecto.slug;

      sails.log.info(`🤖 IA DemoFlow: Revisando runtime ${proyecto.slug} en puerto ${puerto}`);

      let estado = await this.verificarPuerto(puerto);

      if (estado.ok) {
        return {
          ok: true,
          mensaje: 'Runtime activo correctamente.'
        };
      }

      sails.log.warn(`⚠️ IA DemoFlow: Runtime ${proyecto.slug} no responde. Intentando reinicio automático...`);

      await this.reiniciarPM2(nombrePM2);

      await new Promise(resolve => setTimeout(resolve, 12000));

      estado = await this.verificarPuerto(puerto);

      if (estado.ok) {
        await Proyecto.updateOne({ id: proyecto.id }).set({
          estadoDeploy: 'activo',
          logDeploy: `${proyecto.logDeploy || ''}\n\n🤖 IA DemoFlow: Runtime reiniciado automáticamente.`
        });

        return {
          ok: true,
          reiniciado: true,
          mensaje: 'Runtime reiniciado automáticamente.'
        };
      }

      await Proyecto.updateOne({ id: proyecto.id }).set({
        estadoDeploy: 'fallido',
        logDeploy: `${proyecto.logDeploy || ''}\n\n❌ IA DemoFlow: Runtime no respondió después del reinicio automático.`
      });

      return {
        ok: false,
        reiniciado: false,
        mensaje: 'Runtime sigue sin responder.'
      };

    } catch (err) {
      sails.log.error('❌ IA DemoFlow: Error revisando runtime');
      sails.log.error(err);

      return {
        ok: false,
        mensaje: err.message
      };
    }
  }

};