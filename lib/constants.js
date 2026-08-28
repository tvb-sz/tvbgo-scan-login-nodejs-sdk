'use strict';

const HOST_PROD = 'https://api.tvbgo.tvb.com';
const HOST_QA = 'https://qa-api.tvbgo.tvb.com';
const HOST_DEV = 'https://mytvb.tvb-sz.com';
const LANG_SC = 'zh-HK';
const LANG_EN = 'en';

const MSG_PARAM_INVALID = 'callback URL needed params is missing';

/**
 * @param {string} host
 * @returns {string}
 */
function resolveHost(host) {
  const normalized = String(host == null ? '' : host).trim().replace(/\/+$/, '');
  const lower = normalized.toLowerCase();

  switch (lower) {
    case '':
    case 'prod':
    case 'production':
      return HOST_PROD;
    case 'qa':
      return HOST_QA;
    case 'dev':
    case 'develop':
    case 'development':
      return HOST_DEV;
    default:
      break;
  }

  switch (lower) {
    case HOST_PROD.toLowerCase():
      return HOST_PROD;
    case HOST_QA.toLowerCase():
      return HOST_QA;
    case HOST_DEV.toLowerCase():
      return HOST_DEV;
    default:
      process.emitWarning(
        `unsupported host "${host}", want string prod/qa/dev or constant HOST_PROD/HOST_QA/HOST_DEV, fallback to HOST_PROD`
      );
      return HOST_PROD;
  }
}

module.exports = {
  HOST_PROD,
  HOST_QA,
  HOST_DEV,
  LANG_SC,
  LANG_EN,
  MSG_PARAM_INVALID,
  resolveHost,
};
