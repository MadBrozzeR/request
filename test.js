const http = require('http');
const { request, requestDebugger } = require('./index.js');

const server = http.createServer(function (request, response) {
  if (request.url === '/some/path') {
    const data = JSON.stringify({number: 1, string: 'string', boolean: true});
    response.writeHead(200, {'Content-Length': Buffer.byteLength(data)});
    response.end(data);
  } else {
    response.writeHead(400);
    response.end();
  }
}).listen(8080, function () {
  const options = {
    host: 'localhost',
    port: '8080',
    path: '/some/path',
    headers: {'Content-Type': 'text/html'},
    onResponse: function (data, response) {
      console.log(data.toString());
      console.log(response.statusCode, response.statusMessage);
      server.close();
    },
    getRawRequest: function (data) {
      console.log(data.toString());
    },
    getRawResponse: function (data) {
      console.log(data.toString());
    }
  };
  requestDebugger(options);
});
