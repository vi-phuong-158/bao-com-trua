const http = require('http');
const fs = require('fs');

const server = http.createServer((request, response) => {
  const urlPath = (request.url || '/').split('?')[0];

  let targetFile = 'Index.html';
  if (urlPath === '/admin') {
    targetFile = 'AdminDashboard.html';
  } else if (urlPath !== '/') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  fs.readFile(targetFile, (error, content) => {
    if (error) {
      response.writeHead(500);
      response.end(`Could not load ${targetFile}`);
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  });
});

server.listen(4173, '127.0.0.1', () => {
  console.log('Báo cơm trưa preview: http://127.0.0.1:4173 (User)');
  console.log('Admin Dashboard preview: http://127.0.0.1:4173/admin (Admin)');
});
