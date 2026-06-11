const mysql = require('mysql2/promise');

let pool;

async function init() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'laronde',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
    await migrate();
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS municipalities (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255),
      plan VARCHAR(50) DEFAULT 'basic',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      municipalityId VARCHAR(36) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      role ENUM('chef','technicien') NOT NULL DEFAULT 'technicien',
      sector VARCHAR(100),
      phone VARCHAR(30),
      isActive BOOLEAN DEFAULT TRUE,
      lastLoginAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (municipalityId) REFERENCES municipalities(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bins (
      id VARCHAR(36) PRIMARY KEY,
      municipalityId VARCHAR(36) NOT NULL,
      address VARCHAR(500) NOT NULL,
      neighborhood VARCHAR(255),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      type ENUM('ordures','recyclable','verre','encombrants','autre') DEFAULT 'ordures',
      frequency ENUM('quotidienne','bihebdomadaire','hebdomadaire') DEFAULT 'hebdomadaire',
      sector VARCHAR(100),
      assignedUserId VARCHAR(36),
      notes TEXT,
      status ENUM('active','archived') DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (municipalityId) REFERENCES municipalities(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id VARCHAR(36) PRIMARY KEY,
      binId VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      gpsLatitude DECIMAL(10,8),
      gpsLongitude DECIMAL(11,8),
      gpsAccuracy FLOAT,
      collectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (binId) REFERENCES bins(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS remarks (
      id VARCHAR(36) PRIMARY KEY,
      binId VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      type ENUM('dechire','degrade','debordant','manquant','autre') NOT NULL,
      description TEXT,
      status ENUM('open','resolved') DEFAULT 'open',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (binId) REFERENCES bins(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Seed default municipality + chef if none exists
  const [rows] = await pool.query('SELECT id FROM municipalities LIMIT 1');
  if (rows.length === 0) {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    const mId = uuidv4();
    const uId = uuidv4();
    await pool.query(
      'INSERT INTO municipalities (id, name, slug, email) VALUES (?, ?, ?, ?)',
      [mId, 'Mairie Demo', 'mairie-demo', 'admin@mairie.fr']
    );
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (id, municipalityId, email, passwordHash, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uId, mId, 'admin@mairie.fr', hash, 'Admin', 'Chef', 'chef']
    );
    console.log('Seeded default admin: admin@mairie.fr / admin123');
  }

  console.log('Database migrated');
}

function query(sql, params) {
  return pool.query(sql, params);
}

module.exports = { init, query };
