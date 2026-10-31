const https = require('https');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, '..', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'cert.pem')),
  },
  (req, res) => {
    let urlPath = req.url || '/';
    const qIdx = urlPath.indexOf('?');
    if (qIdx >= 0) urlPath = urlPath.substring(0, qIdx);

    let filePath = path.join(distDir, urlPath);
    if (urlPath === '/' || urlPath === '') {
      filePath = path.join(distDir, 'index.html');
    }

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const indexPath = path.join(distDir, 'index.html');
        fs.readFile(indexPath, (err2, indexData) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        });
        return;
      }

      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  }
);

const PORT = 4443;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('  MetaView HUD - HTTPS Server');
  console.log('========================================');
  console.log('  Local:   https://localhost:' + PORT);
  console.log('  Network: https://192.168.2.6:' + PORT);
  console.log('');
  console.log('  iPhone usage:');
  console.log('  1. Open Safari -> https://192.168.2.6:' + PORT);
  console.log('  2. Tap "Advanced" -> "Proceed" (self-signed cert)');
  console.log('  3. Share button -> "Add to Home Screen"');
  console.log('  4. Launch from home icon = Fullscreen PWA');
  console.log('========================================');
  console.log('');
});
