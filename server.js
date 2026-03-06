const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname);
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
http.createServer((req, res) => {
    const fp = path.join(root, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(fp);
    try {
        const d = fs.readFileSync(fp);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(d);
    } catch (e) {
        res.writeHead(404);
        res.end('Not found');
    }
}).listen(7823, () => console.log('Server on port 7823'));
