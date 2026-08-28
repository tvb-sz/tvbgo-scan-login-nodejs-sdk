'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_UA = 'tvbgo-scan-login-nodejs-sdk';

/**
 * @param {string} method
 * @param {string} urlString
 * @param {{headers?: Record<string, string>, body?: string|Buffer, timeout?: number}} [options]
 * @returns {Promise<{statusCode: number, headers: object, body: Buffer}>}
 */
function request(method, urlString, options) {
  const opts = options || {};
  const headers = Object.assign(
    { 'User-Agent': DEFAULT_UA },
    opts.headers || {}
  );
  if (opts.body) {
    headers['Content-Length'] = Buffer.byteLength(opts.body);
  }

  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlString);
    } catch (err) {
      reject(err);
      return;
    }

    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        timeout: opts.timeout || DEFAULT_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('request timeout'));
    });
    req.on('error', reject);

    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
}

/**
 * @param {string} urlString
 * @param {Record<string, string>} [headers]
 * @returns {Promise<{statusCode: number, headers: object, body: Buffer}>}
 */
function get(urlString, headers) {
  return request('GET', urlString, { headers: headers || {} });
}

/**
 * @param {string} urlString
 * @param {Record<string, string>} form
 * @param {Record<string, string>} [headers]
 * @returns {Promise<{statusCode: number, headers: object, body: Buffer}>}
 */
function postForm(urlString, form, headers) {
  const body = new URLSearchParams(form || {}).toString();
  return request('POST', urlString, {
    body,
    headers: Object.assign(
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      headers || {}
    ),
  });
}

module.exports = {
  request,
  get,
  postForm,
};
