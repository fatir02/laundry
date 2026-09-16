const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.join(__dirname, '..', 'laundry.db');

// Support Vercel Serverless environment
if (process.env.VERCEL) {
  const tmpDb = path.join('/tmp', 'laundry.db');
  if (!fs.existsSync(tmpDb) && fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, tmpDb);
    } catch (e) {
      console.error('Error copying db to /tmp:', e);
    }
  }
  dbPath = tmpDb;
}

const db = new Database(dbPath);

// Enable WAL mode & foreign keys
try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (e) {
  console.log('Pragma setup:', e.message);
}

// Initialize database schema
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_per_unit INTEGER NOT NULL,
      price_per_kg INTEGER DEFAULT 6000,
      unit_type TEXT NOT NULL DEFAULT 'kg',
      estimated_days INTEGER NOT NULL DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      piece_count INTEGER DEFAULT 0,
      total_price INTEGER NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('Belum Lunas', 'Lunas')) NOT NULL DEFAULT 'Belum Lunas',
      laundry_status TEXT CHECK(laundry_status IN ('Sedang Diproses', 'Siap Diambil', 'Siap Diantar', 'Selesai')) NOT NULL DEFAULT 'Sedang Diproses',
      pickup_method TEXT CHECK(pickup_method IN ('Ambil Sendiri', 'Diantar Kurir')) NOT NULL DEFAULT 'Ambil Sendiri',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      estimated_finish_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
    );
  `);

  // Migration for services table
  try {
    const serviceCols = db.prepare("PRAGMA table_info(services)").all();
    const hasPricePerUnit = serviceCols.some(col => col.name === 'price_per_unit');
    const hasPricePerKg = serviceCols.some(col => col.name === 'price_per_kg');
    const hasUnitType = serviceCols.some(col => col.name === 'unit_type');

    if (!hasPricePerUnit) {
      db.exec("ALTER TABLE services ADD COLUMN price_per_unit INTEGER DEFAULT 6000");
    }
    if (hasPricePerKg && hasPricePerUnit) {
      db.exec("UPDATE services SET price_per_unit = price_per_kg WHERE price_per_unit IS NULL OR price_per_unit = 0");
    }
    if (!hasUnitType) {
      db.exec("ALTER TABLE services ADD COLUMN unit_type TEXT DEFAULT 'kg'");
    }
  } catch (e) {
    console.error("Migration services error:", e);
  }

  // Migration for orders table (piece_count)
  try {
    const orderCols = db.prepare("PRAGMA table_info(orders)").all();
    const hasPieceCount = orderCols.some(col => col.name === 'piece_count');
    if (!hasPieceCount) {
      db.exec("ALTER TABLE orders ADD COLUMN piece_count INTEGER DEFAULT 0");
    }
  } catch (e) {
    console.error("Migration orders error:", e);
  }

  // Check columns to build safe insert
  const serviceCols = db.prepare("PRAGMA table_info(services)").all();
  const hasPricePerKg = serviceCols.some(col => col.name === 'price_per_kg');

  const kartikaServices = [
    { name: 'Cuci Setrika Reguler (2-3 Hari)', price: 6000, unit: 'kg', days: 3 },
    { name: 'Cuci Setrika Kilat / Express (1 Hari)', price: 10000, unit: 'kg', days: 1 },
    { name: 'Cuci Kering Lipat (2 Hari)', price: 5000, unit: 'kg', days: 2 },
    { name: 'Setrika Saja (1-2 Hari)', price: 4000, unit: 'kg', days: 2 },
    { name: 'Cuci Bed Cover / Selimut', price: 25000, unit: 'pcs', days: 3 },
    { name: 'Cuci Karpet', price: 35000, unit: 'pcs', days: 4 },
    { name: 'Cuci Sepatu / Helm', price: 20000, unit: 'pasang', days: 2 },
    { name: 'Cuci Jas / Satuan', price: 30000, unit: 'pcs', days: 2 }
  ];

  const existingServices = db.prepare('SELECT name FROM services').all().map(s => s.name);
  
  let insertService;
  if (hasPricePerKg) {
    insertService = db.prepare('INSERT INTO services (name, price_per_unit, price_per_kg, unit_type, estimated_days) VALUES (?, ?, ?, ?, ?)');
  } else {
    insertService = db.prepare('INSERT INTO services (name, price_per_unit, unit_type, estimated_days) VALUES (?, ?, ?, ?)');
  }

  kartikaServices.forEach(ks => {
    if (!existingServices.includes(ks.name)) {
      if (hasPricePerKg) {
        insertService.run(ks.name, ks.price, ks.price, ks.unit, ks.days);
      } else {
        insertService.run(ks.name, ks.price, ks.unit, ks.days);
      }
    }
  });

  // Ensure sample customers if table empty
  const customerCount = db.prepare('SELECT count(*) as count FROM customers').get().count;
  if (customerCount === 0) {
    const insertCustomer = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)');
    insertCustomer.run('Budi Santoso', '081234567890', 'Jl. MT Haryono No. 12, Karangsentul, Purbalingga');
    insertCustomer.run('Siti Rahmawati', '085712345678', 'Perumahan Padamara Indah Blok B-4');
    insertCustomer.run('Rian Hidayat', '089698765432', 'Kost Putra Karangsentul, RT 03/01');
    insertCustomer.run('Dewi Lestari', '082188889999', 'Jl. Letkol Isdiman No. 20, Purbalingga');
  }
}

initDB();

module.exports = db;
