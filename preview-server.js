const http = require('http');
const fs = require('fs');

const server = http.createServer((request, response) => {
  if ((request.url || '/').split('?')[0] !== '/') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  fs.readFile('Index.html', (error, content) => {
    if (error) {
      response.writeHead(500);
      response.end('Could not load Index.html');
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
  console.log('Báo cơm trưa preview: http://127.0.0.1:4173');
});
