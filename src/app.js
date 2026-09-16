const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Session Configuration for Admin Authentication
app.use(session({
  secret: 'kartika-laundry-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Set View Engine
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

// Helpers for formatting
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num || 0);
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function generateInvoiceCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `KLND${datePart}${randomPart}`;
}

// Make helpers & outlet identity available to all views
app.use((req, res, next) => {
  res.locals.formatRupiah = formatRupiah;
  res.locals.formatDateIndo = formatDateIndo;
  res.locals.formatDateShort = formatDateShort;
  res.locals.outlet = {
    name: 'KARTIKA LAUNDRY',
    tagline: 'Bersih, Wangi, Rapi, & Tepat Waktu',
    address: 'Jl. MT. Haryono No.57, Desa Karangsentul, Kec. Padamara, Purbalingga, Jawa Tengah',
    phone: '081227800060',
    phoneRaw: '6281227800060',
    hours: 'Senin–Sabtu 08.00–20.00 WIB | Minggu 13.00–19.00 WIB'
  };
  res.locals.bankInfo = {
    bankName: 'Bank Syariah Indonesia (BSI)',
    accountNumber: '7201510664',
    accountHolder: 'AHMAD RIZKY FAUZAN'
  };
  res.locals.currentUrl = req.originalUrl || '';
  res.locals.hostUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.isAdmin = !!req.session.isAdmin;
  next();
});

// Admin Authentication Middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// ================= PUBLIC TRACKING ROUTES =================

// Home -> redirect to tracking
app.get('/', (req, res) => {
  res.redirect('/track');
});

// Tracking Search Page
app.get('/track', (req, res) => {
  const { invoice } = req.query;
  if (invoice) {
    return res.redirect(`/track/${encodeURIComponent(invoice.trim().toUpperCase())}`);
  }
  
  // Sample recent orders for quick demo
  const recentOrders = db.prepare(`
    SELECT o.invoice_code, c.name as customer_name, o.laundry_status, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.id DESC LIMIT 4
  `).all();

  res.render('track', {
    order: null,
    searchQuery: '',
    errorMessage: null,
    recentOrders
  });
});

// Tracking Detail by Invoice Code
app.get('/track/:invoice_code', (req, res) => {
  const invoiceCode = req.params.invoice_code.trim().toUpperCase();
  const order = db.prepare(`
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.address as customer_address,
      s.name as service_name,
      s.price_per_unit,
      s.unit_type,
      s.estimated_days
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN services s ON o.service_id = s.id
    WHERE UPPER(o.invoice_code) = ?
  `).get(invoiceCode);

  const recentOrders = db.prepare(`
    SELECT o.invoice_code, c.name as customer_name, o.laundry_status, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.id DESC LIMIT 4
  `).all();

  if (!order) {
    return res.status(404).render('track', {
      order: null,
      searchQuery: invoiceCode,
      errorMessage: `Invoice dengan kode "${invoiceCode}" tidak ditemukan. Silakan cek kembali nomor nota cucian Anda.`,
      recentOrders
    });
  }

  res.render('track', {
    order,
    searchQuery: invoiceCode,
    errorMessage: null,
    recentOrders
  });
});

// ================= ADMIN AUTHENTICATION =================

// Admin Login Page
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/orders');
  }
  res.render('admin/login', { error: null });
});

// Admin Login Process
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    return res.redirect('/admin/orders');
  }
  res.render('admin/login', { error: 'Username atau password admin salah!' });
});

// Admin Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/track');
  });
});

// ================= ADMIN DASHBOARD ROUTES (PROTECTED) =================

app.get('/admin', requireAdmin, (req, res) => res.redirect('/admin/orders'));

// 1. Order Management & POS
app.get('/admin/orders', requireAdmin, (req, res) => {
  const { search, laundry_status, payment_status } = req.query;

  let query = `
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.address as customer_address,
      s.name as service_name,
      s.price_per_unit,
      s.unit_type
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN services s ON o.service_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim() !== '') {
    query += ` AND (UPPER(o.invoice_code) LIKE ? OR UPPER(c.name) LIKE ? OR c.phone LIKE ?)`;
    const searchPattern = `%${search.trim().toUpperCase()}%`;
    params.push(searchPattern, searchPattern, `%${search.trim()}%`);
  }

  if (laundry_status && laundry_status !== 'all') {
    query += ` AND o.laundry_status = ?`;
    params.push(laundry_status);
  }

  if (payment_status && payment_status !== 'all') {
    query += ` AND o.payment_status = ?`;
    params.push(payment_status);
  }

  query += ` ORDER BY o.id DESC`;

  const orders = db.prepare(query).all(...params);

  // Stats Summary
  const totalOrdersCount = db.prepare('SELECT count(*) as count FROM orders').get().count;
  const processingCount = db.prepare("SELECT count(*) as count FROM orders WHERE laundry_status = 'Sedang Diproses'").get().count;
  const readyCount = db.prepare("SELECT count(*) as count FROM orders WHERE laundry_status IN ('Siap Diambil', 'Siap Diantar')").get().count;
  const completedCount = db.prepare("SELECT count(*) as count FROM orders WHERE laundry_status = 'Selesai'").get().count;
  const unpaidTotal = db.prepare("SELECT coalesce(sum(total_price), 0) as total FROM orders WHERE payment_status = 'Belum Lunas'").get().total;
  const revenueTotal = db.prepare("SELECT coalesce(sum(total_price), 0) as total FROM orders WHERE payment_status = 'Lunas'").get().total;

  // Form options
  const services = db.prepare('SELECT * FROM services ORDER BY id ASC').all();
  const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();

  res.render('admin/orders', {
    orders,
    services,
    customers,
    filters: {
      search: search || '',
      laundry_status: laundry_status || 'all',
      payment_status: payment_status || 'all'
    },
    stats: {
      total: totalOrdersCount,
      processing: processingCount,
      ready: readyCount,
      completed: completedCount,
      unpaidTotal,
      revenueTotal
    }
  });
});

// 2. REKAP TRANSAKSI & LAPORAN PENJUALAN (Fitur Utama dari Hasil Wawancara)
app.get('/admin/reports', requireAdmin, (req, res) => {
  const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const selectedMonth = req.query.month || currentYearMonth;
  const paymentFilter = req.query.payment_status || 'all';

  let query = `
    SELECT 
      o.*,
      c.name as customer_name,
      c.phone as customer_phone,
      s.name as service_name,
      s.price_per_unit,
      s.unit_type
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN services s ON o.service_id = s.id
    WHERE strftime('%Y-%m', o.created_at) = ?
  `;
  const params = [selectedMonth];

  if (paymentFilter !== 'all') {
    query += ` AND o.payment_status = ?`;
    params.push(paymentFilter);
  }

  query += ` ORDER BY o.created_at ASC, o.id ASC`;

  const reportOrders = db.prepare(query).all(...params);

  // Summary Metrics for the Selected Month
  const summary = {
    totalRevenue: reportOrders.filter(o => o.payment_status === 'Lunas').reduce((acc, o) => acc + o.total_price, 0),
    totalUnpaid: reportOrders.filter(o => o.payment_status === 'Belum Lunas').reduce((acc, o) => acc + o.total_price, 0),
    totalGross: reportOrders.reduce((acc, o) => acc + o.total_price, 0),
    totalOrders: reportOrders.length,
    totalWeight: reportOrders.reduce((acc, o) => acc + (o.weight || 0), 0).toFixed(1),
    totalPieces: reportOrders.reduce((acc, o) => acc + (o.piece_count || 0), 0),
    completedOrders: reportOrders.filter(o => o.laundry_status === 'Selesai').length,
    processingOrders: reportOrders.filter(o => o.laundry_status === 'Sedang Diproses').length,
  };

  // Service Breakdown
  const serviceBreakdown = {};
  reportOrders.forEach(o => {
    if (!serviceBreakdown[o.service_name]) {
      serviceBreakdown[o.service_name] = { count: 0, total_kg: 0, total_income: 0 };
    }
    serviceBreakdown[o.service_name].count += 1;
    serviceBreakdown[o.service_name].total_kg += (o.weight || 0);
    serviceBreakdown[o.service_name].total_income += o.total_price;
  });

  // Available Months for Selector (distinct from database)
  const availableMonths = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', created_at) as month 
    FROM orders 
    WHERE created_at IS NOT NULL 
    ORDER BY month DESC
  `).all().map(r => r.month);

  if (!availableMonths.includes(currentYearMonth)) {
    availableMonths.unshift(currentYearMonth);
  }

  res.render('admin/reports', {
    orders: reportOrders,
    summary,
    serviceBreakdown,
    selectedMonth,
    paymentFilter,
    availableMonths
  });
});

// 3. EXPORT REKAP KE EXCEL / CSV
app.get('/admin/reports/export-csv', requireAdmin, (req, res) => {
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);
  
  const reportOrders = db.prepare(`
    SELECT 
      o.invoice_code,
      o.created_at,
      c.name as customer_name,
      c.phone as customer_phone,
      s.name as service_name,
      o.weight,
      o.piece_count,
      o.total_price,
      o.payment_status,
      o.laundry_status,
      o.pickup_method,
      o.notes
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN services s ON o.service_id = s.id
    WHERE strftime('%Y-%m', o.created_at) = ?
    ORDER BY o.created_at ASC
  `).all(selectedMonth);

  // Generate CSV Header & Rows
  let csv = "No Invoice,Tanggal,Pelanggan,No HP,Layanan,Berat (Kg),Jumlah Baju (Pcs),Total Tagihan (Rp),Status Pembayaran,Status Laundry,Pengambilan,Catatan\n";
  
  reportOrders.forEach(o => {
    const row = [
      `"${o.invoice_code}"`,
      `"${o.created_at}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${(o.service_name || '').replace(/"/g, '""')}"`,
      o.weight,
      o.piece_count || 0,
      o.total_price,
      `"${o.payment_status}"`,
      `"${o.laundry_status}"`,
      `"${o.pickup_method}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(",") + "\n";
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Rekap_Kartika_Laundry_${selectedMonth}.csv"`);
  res.send("\uFEFF" + csv); // Include BOM for Excel UTF-8
});

// Admin Create New Order
app.post('/admin/orders', requireAdmin, (req, res) => {
  try {
    const {
      customer_type,
      existing_customer_id,
      customer_name,
      customer_phone,
      customer_address,
      service_id,
      weight,
      piece_count,
      pickup_method,
      payment_status,
      notes
    } = req.body;

    let customerId = existing_customer_id;

    if (customer_type === 'new' || !customerId) {
      if (!customer_name || !customer_phone) {
        return res.status(400).send('Nama dan nomor telepon pelanggan wajib diisi.');
      }
      const insertCustomer = db.prepare('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)');
      const custResult = insertCustomer.run(
        customer_name.trim(),
        customer_phone.trim(),
        customer_address ? customer_address.trim() : '-'
      );
      customerId = custResult.lastInsertRowid;
    }

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
    if (!service) {
      return res.status(400).send('Layanan tidak valid.');
    }

    const parsedWeight = parseFloat(weight) || 1.0;
    const parsedPieces = parseInt(piece_count) || 0;
    const totalPrice = Math.round(parsedWeight * service.price_per_unit);
    const invoiceCode = generateInvoiceCode();

    const now = new Date();
    const estFinish = new Date(now.getTime() + (service.estimated_days || 3) * 24 * 60 * 60 * 1000);
    const formatDt = (d) => d.toISOString().replace('T', ' ').substring(0, 19);

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        invoice_code, customer_id, service_id, weight, piece_count, total_price,
        payment_status, laundry_status, pickup_method, notes, created_at, estimated_finish_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      invoiceCode,
      customerId,
      service.id,
      parsedWeight,
      parsedPieces,
      totalPrice,
      payment_status || 'Belum Lunas',
      'Sedang Diproses',
      pickup_method || 'Ambil Sendiri',
      notes ? notes.trim() : null,
      formatDt(now),
      formatDt(estFinish)
    );

    res.redirect('/admin/orders?created=' + invoiceCode);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).send('Gagal membuat pesanan: ' + err.message);
  }
});

// Admin Quick Update Laundry Status
app.post('/admin/orders/:id/next-status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.redirect('/admin/orders');
  }

  let nextStatus = 'Sedang Diproses';
  if (order.laundry_status === 'Sedang Diproses') {
    nextStatus = order.pickup_method === 'Diantar Kurir' ? 'Siap Diantar' : 'Siap Diambil';
  } else if (order.laundry_status === 'Siap Diambil' || order.laundry_status === 'Siap Diantar') {
    nextStatus = 'Selesai';
  } else {
    nextStatus = 'Sedang Diproses';
  }

  db.prepare('UPDATE orders SET laundry_status = ? WHERE id = ?').run(nextStatus, id);
  res.redirect('/admin/orders');
});

// Admin Quick Toggle Payment Status
app.post('/admin/orders/:id/toggle-payment', requireAdmin, (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.redirect('/admin/orders');
  }

  const newStatus = order.payment_status === 'Lunas' ? 'Belum Lunas' : 'Lunas';
  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(newStatus, id);
  res.redirect('/admin/orders');
});

// Admin Delete Order
app.post('/admin/orders/:id/delete', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  res.redirect('/admin/orders');
});

// Start Server (Only listen if not in serverless/Vercel)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🚀 KARTIKA LAUNDRY Server running at http://localhost:${PORT}`);
    console.log(`  📍 Outlet: Padamara, Purbalingga, Jawa Tengah`);
    console.log(`  🔍 Customer Tracking: http://localhost:${PORT}/track`);
    console.log(`  💼 Admin Login:       http://localhost:${PORT}/admin/login`);
    console.log(`  📊 Rekap Penjualan:   http://localhost:${PORT}/admin/reports`);
    console.log(`  🔐 Default Admin:     admin / admin123`);
    console.log(`====================================================`);
  });
}

module.exports = app;
