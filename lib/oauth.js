'use strict';

const httpClient = require('./http');
const { OauthError } = require('./errors');
const {
  LANG_EN,
  LANG_SC,
  MSG_PARAM_INVALID,
  resolveHost,
} = require('./constants');

class Oauth {
  /**
   * 構造一個 TVB Go OAuth 授權管理器對象
   * @param {string} clientId 應用程序(客戶端) ID
   * @param {string} clientSecret 應用秘鑰，在具體應用的「客戶端憑據」裏創建客戶端密碼，注意有輪轉有效期
   * @param {string} redirectUri 在具體應用的客戶端憑據裏的「重定向 URI」添加設置，支持多個
   * @param {string} [host] 環境切換：prod / qa / dev，或 HOST_PROD / HOST_QA / HOST_DEV；空值默認 prod
   */
  constructor(clientId, clientSecret, redirectUri, host) {
    this.clientId = String(clientId || '');
    this.clientSecret = String(clientSecret || '');
    this.redirectUri = String(redirectUri || '');
    this.host = resolveHost(host);
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  apiURL(path) {
    return this.host + path;
  }

  /**
   * 生成 301/302 跳轉到 TVB Go 的授權 URL
   * @param {string} state 跳轉去 oauth 授權後原樣帶回的任意字符串（128 字符以內）
   * @param {string} [lang] 掃碼界面文字語言，取值字符串 en、zh-HK，或使用包常量 LANG_SC、LANG_EN
   * @returns {string}
   */
  generateRedirectURL(state, lang) {
    const param = new URLSearchParams();
    param.set('client_id', this.clientId);
    param.set('response_type', 'code');
    param.set('redirect_uri', this.redirectUri);
    param.set('scope', 'scan_login');
    param.set('state', state == null ? '' : String(state));
    param.set('lang', lang === LANG_EN ? LANG_EN : LANG_SC);
    return `${this.apiURL('/connect/qrconnect')}?${param.toString()}`;
  }

  /**
   * TVB Go 授權後回調 callback 後使用 code 去換令牌，請務必同時取出 state 進行比對後再調用本方法
   * @param {string} code 回到 callback URL 後從 query-string 裏取出的 code 值
   * @returns {Promise<{token_type: string, scope: string, expires_in: number, access_token: string, refresh_token: string, openid: string}>}
   */
  async code2accessToken(code) {
    if (!code) {
      throw invalidParamError();
    }
    return this.tvbGoCode2accessToken(code);
  }

  /**
   * 使用 refresh_token 刷新 access_token 的有效期
   * @param {string} refreshToken code2accessToken 獲取到的 refresh_token
   * @returns {Promise<{token_type: string, scope: string, expires_in: number, access_token: string, refresh_token: string, openid: string}>}
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw invalidParamError();
    }
    return this.tvbGoRefreshAccessToken(refreshToken);
  }

  /**
   * 獲取到令牌值後獲取用戶信息（可以獲取到郵箱）
   * @param {string} token 有效的令牌，code2accessToken 獲取到的 access_token
   * @returns {Promise<{openid: string, email: string, employee_id: string, chi_name: string, eng_name: string, department: string}>}
   */
  async token2userInfo(token) {
    if (!token) {
      throw invalidParamError();
    }
    return this.tvbGoAccessToken2UserInfo(token);
  }

  /**
   * @param {string} code
   * @returns {Promise<object>}
   */
  async tvbGoCode2accessToken(code) {
    const param = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    };
    return this.exchangeToken(this.apiURL('/connect/oauth/access_token'), param);
  }

  /**
   * @param {string} refreshToken
   * @returns {Promise<object>}
   */
  async tvbGoRefreshAccessToken(refreshToken) {
    const param = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: this.redirectUri,
    };
    return this.exchangeToken(this.apiURL('/connect/oauth/refresh_token'), param);
  }

  /**
   * @param {string} endpoint
   * @param {Record<string, string>} param
   * @returns {Promise<object>}
   */
  async exchangeToken(endpoint, param) {
    let result;
    try {
      result = await httpClient.postForm(endpoint, param);
    } catch (err) {
      throw oauthErrorFromNetwork(err);
    }

    const oauthErr = oauthErrorFromResult(result);
    if (oauthErr) {
      throw oauthErr;
    }

    const accessToken = decodeJSON(result.body);
    if (!accessToken.access_token) {
      throw new OauthError({
        code: 'server_error',
        errorDescription: 'missing access_token in token response',
        statusCode: result.statusCode,
      });
    }
    return accessToken;
  }

  /**
   * @param {string} accessToken
   * @returns {Promise<object>}
   */
  async tvbGoAccessToken2UserInfo(accessToken) {
    let result;
    try {
      result = await httpClient.get(this.apiURL('/connect/oauth/userinfo'), {
        Authorization: `Bearer ${accessToken}`,
      });
    } catch (err) {
      throw oauthErrorFromNetwork(err);
    }

    const oauthErr = oauthErrorFromResult(result);
    if (oauthErr) {
      throw oauthErr;
    }
    return decodeJSON(result.body);
  }
}

function invalidParamError() {
  return new OauthError({
    code: 'invalid_request',
    errorDescription: MSG_PARAM_INVALID,
  });
}

function oauthErrorFromNetwork(err) {
  return new OauthError({
    code: 'server_error',
    errorDescription: err && err.message ? err.message : String(err),
    cause: err,
  });
}

/**
 * 非 200 時按 RFC 6749 解析 body 中的 error / error_description
 * @param {{statusCode: number, body: Buffer}} result
 * @returns {OauthError|null}
 */
function oauthErrorFromResult(result) {
  if (result.statusCode === 200) {
    return null;
  }

  const oe = new OauthError({
    code: 'server_error',
    errorDescription: `unexpected http status ${result.statusCode}`,
    statusCode: result.statusCode,
  });

  const raw = result.body && result.body.length > 0 ? result.body.toString('utf8') : '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.error) {
          oe.code = String(parsed.error);
        }
        if (parsed.error_description) {
          oe.errorDescription = String(parsed.error_description);
        }
        if (parsed.error_uri) {
          oe.errorUri = String(parsed.error_uri);
        }
        oe.message = oe.code && oe.errorDescription
          ? `${oe.code}: ${oe.errorDescription}`
          : (oe.code || oe.errorDescription || oe.message);
      }
    } catch (_err) {
      // keep default server_error
    }
  }
  return oe;
}

/**
 * @param {Buffer} body
 * @returns {object}
 */
function decodeJSON(body) {
  try {
    const parsed = JSON.parse(body.toString('utf8') || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid json response');
    }
    return parsed;
  } catch (err) {
    throw new OauthError({
      code: 'server_error',
      errorDescription: err && err.message ? err.message : String(err),
      cause: err,
    });
  }
}

module.exports = {
  Oauth,
};
