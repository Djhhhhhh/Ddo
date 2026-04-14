/**
 * Mock 服务 - 用于测试 ddo start/stop/status
 * 模拟 server-go、llm-py、web-ui 的行为
 */

const http = require('http');
const serviceName = process.argv[2] || 'mock';
const port = parseInt(process.argv[3]) || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: serviceName,
      pid: process.pid
    }));
  } else {
    res.writeHead(200);
    res.end(`Mock ${serviceName} running`);
  }
});

server.listen(port, () => {
  console.log(`Mock ${serviceName} listening on port ${port}`);
  console.log(`PID: ${process.pid}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log(`Mock ${serviceName} received SIGTERM`);
  server.close(() => {
    process.exit(0);
  });
});
