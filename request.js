const http = require('http');
const https = require('https');

const EMPTY_BUFFER = Buffer.alloc(0);

function request ({
  host = 'localhost',
  port,
  method = 'GET',
  headers,
  data = '',
  secure = false,
  path = '/',
  url,
  onData,
  onResponse,
  onError
}) {
  if (url) {
    secure = url[4] === 's';
  }

  const protocol = secure ? https : http;
  const args = [];

  if (url) {
    args.push(url);
  }
  args.push({
    method,
    headers,
    host,
    port,
    path
  }, function (response) {
    const chunks = [];
    let length = 0;

    response.on('data', function (chunk) {
      chunks.push(chunk);
      length += chunk.length;
      onData && onData(chunk, length);
    }).on('end', function () {
      const data = chunks.length > 1 ? Buffer.concat(chunks, length) : (chunks[0] || EMPTY_BUFFER);
      onResponse && onResponse(data, response);
    }).on('error', function (error) {
      onError && onError(error);
    });
  });

  return protocol.request.apply(protocol, args).on('error', function (error) {
    onError && onError(error);
  }).end(data);
}

module.exports = request;
