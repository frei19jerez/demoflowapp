/**
 * PerfilService.js
 * Lógica central de perfiles públicos de DemoFlowApp.
 */

'use strict';

module.exports = {

  normalizarTexto: function (valor) {
    return String(
      typeof valor === 'undefined' || valor === null
        ? ''
        : valor
    ).trim();
  },

  crearSlug: function (texto) {
    const slug = this.normalizarTexto(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140);

    return slug || `usuario-${Date.now()}`;
  },

  normalizarLista: function (valor) {
    if (Array.isArray(valor)) {
      return valor
        .map((elemento) => this.normalizarTexto(elemento))
        .filter(Boolean)
        .slice(0, 30);
    }

    return this.normalizarTexto(valor)
      .split(',')
      .map((elemento) => elemento.trim())
      .filter(Boolean)
      .slice(0, 30);
  },

  normalizarUrl: function (valor) {
    const texto = this.normalizarTexto(valor);

    if (!texto) {
      return null;
    }

    if (
      texto.startsWith('http://') ||
      texto.startsWith('https://')
    ) {
      return texto;
    }

    return `https://${texto}`;
  },

  slugDisponible: async function (slug, perfilId = null) {
    const criterio = {
      slug
    };

    if (perfilId) {
      criterio.id = {
        '!=': perfilId
      };
    }

    const existente = await Perfil.findOne(criterio);

    return !existente;
  },

  generarSlugUnico: async function (
    nombre,
    perfilId = null
  ) {
    const base = this.crearSlug(nombre);

    let candidato = base;
    let numero = 2;

    while (
      !(await this.slugDisponible(candidato, perfilId))
    ) {
      candidato = `${base}-${numero}`;
      numero += 1;
    }

    return candidato;
  },

  crearPerfilInicial: async function (usuario) {
    if (!usuario || !usuario.id) {
      throw new Error(
        'Usuario requerido para crear el perfil.'
      );
    }

    const existente = await Perfil.findOne({
      usuario: usuario.id
    });

    if (existente) {
      return existente;
    }

    const nombre =
      usuario.nombre ||
      usuario.username ||
      (
        usuario.email
          ? usuario.email.split('@')[0]
          : `Usuario ${usuario.id}`
      );

    const slug = await this.generarSlugUnico(nombre);

    return await Perfil.create({
      usuario: usuario.id,
      slug,
      nombrePublico: nombre,
      tituloProfesional: 'Desarrollador de software',
      biografia:
        'Miembro de la comunidad DemoFlow. Aquí puedes conocer mis aplicaciones y proyectos.',
      fotoPerfil: null,
      fotoPortada: null,
      pais: null,
      ciudad: null,
      empresa: null,
      tipoPerfil: 'desarrollador',
      tecnologias: [],
      servicios: [],
      github: null,
      linkedin: null,
      sitioWeb: null,
      whatsapp: null,
      correoContacto: usuario.email || null,
      mostrarWhatsapp: false,
      mostrarCorreo: false,
      disponibleFreelance: false,
      verificado: false,
      publico: true,
      visitas: 0,
      reputacion: 0,
      fechaCreacion: Date.now(),
      fechaActualizacion: Date.now()
    }).fetch();
  },

  obtenerOCrearPorUsuario: async function (usuario) {
    let perfil = await Perfil.findOne({
      usuario: usuario.id
    });

    if (!perfil) {
      perfil = await this.crearPerfilInicial(usuario);
    }

    return perfil;
  },

  actualizar: async function ({
    perfil,
    datos
  }) {
    if (!perfil || !perfil.id) {
      throw new Error('Perfil requerido.');
    }

    const nombrePublico =
      this.normalizarTexto(datos.nombrePublico) ||
      perfil.nombrePublico ||
      'Usuario DemoFlow';

    let slug = perfil.slug;

    if (
      datos.slug &&
      this.normalizarTexto(datos.slug) !== perfil.slug
    ) {
      slug = await this.generarSlugUnico(
        datos.slug,
        perfil.id
      );
    }

    const tipoPermitido = [
      'desarrollador',
      'freelancer',
      'estudiante',
      'startup',
      'empresa'
    ];

    const tipoSolicitado =
      this.normalizarTexto(datos.tipoPerfil)
        .toLowerCase();

    const tipoPerfil =
      tipoPermitido.includes(tipoSolicitado)
        ? tipoSolicitado
        : perfil.tipoPerfil || 'desarrollador';

    const cambios = {
      slug,
      nombrePublico,
      tituloProfesional:
        this.normalizarTexto(
          datos.tituloProfesional
        ) || null,
      biografia:
        this.normalizarTexto(datos.biografia) || null,
      pais:
        this.normalizarTexto(datos.pais) || null,
      ciudad:
        this.normalizarTexto(datos.ciudad) || null,
      empresa:
        this.normalizarTexto(datos.empresa) || null,
      tipoPerfil,
      tecnologias:
        this.normalizarLista(datos.tecnologias),
      servicios:
        this.normalizarLista(datos.servicios),
      github:
        this.normalizarUrl(datos.github),
      linkedin:
        this.normalizarUrl(datos.linkedin),
      sitioWeb:
        this.normalizarUrl(datos.sitioWeb),
      whatsapp:
        this.normalizarTexto(datos.whatsapp) || null,
      correoContacto:
        this.normalizarTexto(
          datos.correoContacto
        ) || null,
      mostrarWhatsapp:
        datos.mostrarWhatsapp === true ||
        datos.mostrarWhatsapp === 'true' ||
        datos.mostrarWhatsapp === 'on',
      mostrarCorreo:
        datos.mostrarCorreo === true ||
        datos.mostrarCorreo === 'true' ||
        datos.mostrarCorreo === 'on',
      disponibleFreelance:
        datos.disponibleFreelance === true ||
        datos.disponibleFreelance === 'true' ||
        datos.disponibleFreelance === 'on',
      publico:
        datos.publico === true ||
        datos.publico === 'true' ||
        datos.publico === 'on',
      fechaActualizacion: Date.now()
    };

    return await Perfil.updateOne({
      id: perfil.id
    }).set(cambios);
  },

  incrementarVisitas: async function (perfil) {
    if (!perfil || !perfil.id) {
      return perfil;
    }

    const visitas =
      Math.max(0, Number(perfil.visitas || 0)) + 1;

    const actualizado = await Perfil.updateOne({
      id: perfil.id
    }).set({
      visitas,
      fechaActualizacion:
        perfil.fechaActualizacion || Date.now()
    });

    return actualizado || perfil;
  }

};