'use strict';

const { Oauth } = require('./lib/oauth');
const { OauthError } = require('./lib/errors');
const {
  HOST_PROD,
  HOST_QA,
  HOST_DEV,
  LANG_SC,
  LANG_EN,
} = require('./lib/constants');

module.exports = {
  Oauth,
  OauthError,
  HOST_PROD,
  HOST_QA,
  HOST_DEV,
  LANG_SC,
  LANG_EN,
};
