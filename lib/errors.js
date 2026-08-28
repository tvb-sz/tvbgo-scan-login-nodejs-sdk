'use strict';

class OauthError extends Error {
  /**
   * RFC 6749 §5.2 錯誤響應，同時作爲本 SDK 接口方法的統一錯誤。
   * @param {{code?: string, errorDescription?: string, errorUri?: string, statusCode?: number, cause?: Error}} [opts]
   */
  constructor(opts) {
    const options = opts || {};
    const code = options.code || '';
    const errorDescription = options.errorDescription || '';
    let message = 'oauth error';
    if (code && errorDescription) {
      message = `${code}: ${errorDescription}`;
    } else if (code) {
      message = code;
    } else if (errorDescription) {
      message = errorDescription;
    } else if (options.cause && options.cause.message) {
      message = options.cause.message;
    }

    super(message);
    this.name = 'OauthError';
    this.code = code;
    this.errorDescription = errorDescription;
    this.errorUri = options.errorUri || '';
    this.statusCode = options.statusCode || 0;
    if (options.cause) {
      this.cause = options.cause;
    }
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, OauthError);
    }
  }
}

module.exports = { OauthError };
