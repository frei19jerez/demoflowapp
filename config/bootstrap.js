module.exports.bootstrap = async function () {

  sails.getBaseUrl = function () {
    if (process.env.NODE_ENV === 'production') {
      return 'https://demoflowapp.com';
    }

    return 'http://localhost:1337';
  };

  // =====================================
  // 🔄 RECUPERAR RUNTIMES DESPUÉS DE REINICIO
  // =====================================

  setTimeout(async function () {
    try {
      if (typeof RuntimeRecoveryService !== 'undefined') {
        await RuntimeRecoveryService.recuperarRuntimes();
      }
    } catch (error) {
      sails.log.error('❌ IA DemoFlow: Error ejecutando RuntimeRecoveryService.');
      sails.log.error(error);
    }
  }, 8000);

};