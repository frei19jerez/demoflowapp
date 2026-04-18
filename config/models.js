module.exports.models = {

  migrate: 'safe',

  attributes: {
    id: { type: 'number', autoIncrement: true }
  },

  dataEncryptionKeys: {
    default: 'yJ330eVxY8OFPL5t+xMt1QJw+uwQWlox7Zzs6zN2S1o='
  },

  cascadeOnDestroy: true

};