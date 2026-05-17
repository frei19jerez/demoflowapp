module.exports.models = {

  // 🔐 No toca tablas ni en local ni en producción
  migrate: 'safe',

  dataEncryptionKeys: {
    default: 'yJ330eVxY8OFPL5t+xMt1QJw+uwQWlox7Zzs6zN2S1o='
  },

  cascadeOnDestroy: true

};