const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');

const URL_RE = /^(http[s]?):\/\/([^\/:]+)(:\d+)?(.*)$/;
const HTTP_RESPONSE_LINE = /^HTTP\/[^ ]+ (\d{3}) (.+?)\r?\n/;
const HEADER_LINE = /([\w-]+): (.+?)\r?\n/g;
const HTTP_REQUEST_LINE = '${method} ${path} HTTP/1.1\r\n';
const EMPTY_BUFFER = Buffer.alloc(0);
const EMPTY_LINE = Buffer.from('\r\n\r\n');
const LF = Buffer.from('\n');

function parseResponse (response) {
  const lfIndex = response.indexOf(LF);
  const separatorIndex = response.indexOf(EMPTY_LINE);
  const firstLine = response.toString('utf-8', 0, lfIndex);
  const headersRaw = response.toString('utf-8', lfIndex + 1, separatorIndex);
  const data = Buffer.allocUnsafe(response.length - separatorIndex - 2);
  response.copy(data, 0, separatorIndex + 2);
  let regMatch = HTTP_RESPONSE_LINE.exec(firstLine);
  let statusCode;
  let statusMessage;
  const headers = {};

  if (regMatch) {
    statusCode = parseInt(regMatch[1], 10);
    statusMessage = regMatch[2];
  }

  while (regMatch = HEADER_LINE.exec(headersRaw)) {
    if (headers[regMatch[1]] instanceof Array) {
      headers[regMatch[1]].push(regMatch[2]);
    } else if (headers[regMatch[1]] === undefined) {
      headers[regMatch[1]] = regMatch[2];
    } else {
      headers[regMatch[1]] = [headers[regMatch[1]], regMatch[2]];
    }
  }

  return {
    statusCode,
    statusMessage,
    headers,
    data
  };
}

function request ({
  host = 'localhost',
  port,
  method = 'GET',
  headers,
  data = '',
  secure = false,
  path = '/',
  url,
  getRawRequest,
  getRawResponse
}, callback) {
  let regMatch;

  if (url && (regMatch = URL_RE.exec(url))) {
    secure = regMatch[1] === 'https';
    host = regMatch[2];
    regMatch[3] && (port = regMatch[3]);
    regMatch[4] && (path = regMatch[4]);
  }

  headers = Object.assign({
    Host: host + (port ? (':' + port) : ''),
    Connection: 'close'
  }, headers);

  let result = `${method} ${path} HTTP/1.1\r\n`;

  for (const key in headers) {
    if (headers[key] instanceof Array) {
      for (let index = 0 ; index < headers[key].length ; ++index) {
        result += `${key}: ${headers[key][index]}\r\n`;
      }
    } else {
      result += `${key}: ${headers[key]}\r\n`
    }
  }

  result += '\r\n';

  const resultLength = Buffer.byteLength(result);
  const buffer = Buffer.allocUnsafe(resultLength + Buffer.byteLength(data));
  buffer.write(result);
  if (data instanceof Buffer) {
    data.copy(buffer, 0, resultLength);
  } else if (typeof data === 'string') {
    buffer.write(data, resultLength);
  }

  const protocol = secure ? tls : net;

  getRawRequest && getRawRequest(buffer);

  port || (port = (secure ? 443 : 80));
  protocol.connect({port, host}, function () {
    const data = [];
    let length = 0;

    this.on('data', function (chunk) {
      data.push(chunk);
      length += chunk.length;
    }).on('end', function () {
      const response = data.length > 1 ? Buffer.concat(data, length) : (data[0] || EMPTY_BUFFER);
      getRawResponse && getRawResponse(response);
      const result = parseResponse(response);
      const body = result.data;
      delete result.data;

      callback && callback(null, body, result);
    }).on('error', function (error) {
      callback && callback(error);
    }).write(buffer);
  });
}

module.exports = request;
