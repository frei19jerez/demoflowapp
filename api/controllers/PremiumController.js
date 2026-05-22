module.exports = {

  pricing: async function(req, res) {
    return res.view('pages/pricing', {
      titulo: 'Planes DemoFlow'
    });
  },

  premium: async function(req, res) {
    return res.view('pages/premium', {
      titulo: 'DemoFlow Premium'
    });
  }

};