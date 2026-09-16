<?php
/**
 * KARTIKA LAUNDRY - Web App Gateway
 * Proxy / Bridge to Node.js backend
 */

// If request is made via Laragon Apache, proxy or redirect to Node.js port 3000
$target = 'http://127.0.0.1:3000' . $_SERVER['REQUEST_URI'];

// Check if Node.js server is running
$socket = @fsockopen('127.0.0.1', 3000, $errno, $errstr, 0.5);
if (!$socket) {
    ?>
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Menjalankan Server - KARTIKA LAUNDRY</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    </head>
    <body class="bg-slate-100 font-sans flex items-center justify-center min-h-screen p-4 text-slate-800">
        <div class="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center space-y-4 border border-slate-200">
            <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                🧺
            </div>
            <h1 class="text-xl font-bold text-slate-900">KARTIKA LAUNDRY</h1>
            <p class="text-sm text-slate-500">
                Server aplikasi belum dijalankan. Buka terminal di folder ini dan ketik:
            </p>
            <div class="bg-slate-900 text-emerald-400 font-mono text-sm p-3 rounded-xl text-left select-all">
                cd C:\laragon\www\kartika-laundry<br>
                npm start
            </div>
            <p class="text-xs text-slate-400">Atau double klik file <strong>jalankan-server.bat</strong> di folder proyek.</p>
        </div>
    </body>
    </html>
    <?php
    exit;
}
fclose($socket);

// If Node.js is active, redirect to localhost:3000 or proxy
header("Location: http://localhost:3000" . $_SERVER['REQUEST_URI']);
exit;
