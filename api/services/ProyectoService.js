module.exports = {

  obtenerUrlDemo(slug) {

    const baseUrl =
      process.env.BASE_URL ||
      'https://demoflowapp.com';

    return `${baseUrl}/runtime/${slug}`;

  }

};