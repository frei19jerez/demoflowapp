const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearTablas() {

  await client.connect();

  console.log('🚀 Conectado a PostgreSQL');

  await client.query(`

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      rol VARCHAR(50) DEFAULT 'programador',
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proyectos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      slug VARCHAR(180) UNIQUE NOT NULL,
      descripcion TEXT,
      tipo_proyecto VARCHAR(50) DEFAULT 'externo',
      tecnologia VARCHAR(150),
      url_demo TEXT,
      url_repositorio TEXT,
      archivo_zip_original TEXT,
      carpeta_demo VARCHAR(180),
      carpeta_runtime TEXT,
      comando_inicio TEXT,
      archivo_entrada VARCHAR(180),
      puerto INTEGER,
      deploy_type VARCHAR(50) DEFAULT 'external',
      estado_deploy VARCHAR(50) DEFAULT 'pendiente',
      log_deploy TEXT,
      precio_propuesto VARCHAR(50) DEFAULT '0.00',
      destacado BOOLEAN DEFAULT false,
      activo BOOLEAN DEFAULT true,
      usuario_id INTEGER,
      cliente_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

  `);

  console.log('✅ Tablas creadas correctamente');

  await client.end();

}

crearTablas().catch(console.error);