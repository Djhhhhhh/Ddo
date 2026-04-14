/**
 * Ddo TODO List 本地服务器
 * 提供静态文件服务和数据保存 API
 *
 * 使用方法:
 *   node server.js
 * 然后访问 http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'ddo-tasks.json');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
        res.end(data);
    });
}

function saveData(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            // 解析收到的数据
            const data = JSON.parse(body);

            // 格式化写入文件
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            console.log('✅ 数据已保存到 ddo-tasks.json');
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            console.error('❌ 保存失败:', err.message);
        }
    });
}

function loadData(res) {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'File not found' }));
        }
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
}

const server = http.createServer((req, res) => {
    // CORS 头，允许本地访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url === '/' ? '/TODO_LIST.html' : req.url;
    const filePath = path.join(__dirname, url.split('?')[0]);

    // API: 保存数据
    if (req.url === '/api/save' && req.method === 'POST') {
        saveData(req, res);
        return;
    }

    // API: 加载数据
    if (req.url === '/api/load' && req.method === 'GET') {
        loadData(res);
        return;
    }

    // 静态文件
    serveFile(res, filePath);
});

server.listen(PORT, () => {
    console.log(`
🚀 Ddo TODO List 服务器已启动

访问地址: http://localhost:${PORT}
数据文件: ${DATA_FILE}

操作说明:
  - 页面上修改任务会自动保存到 ddo-tasks.json
  - 首次启动会加载现有的 ddo-tasks.json
  - 按 Ctrl+C 停止服务器
`);
});
