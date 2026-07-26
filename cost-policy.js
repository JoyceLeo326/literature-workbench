(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LitpathCostPolicy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_COST_MODE = 'zero_owner_cost';
  var PROVIDERS = {
    crossref: {
      enabled: true,
      access: 'public_free_only',
      allowedOrigin: 'https://api.crossref.org',
      paidFallback: false,
      reason: '仅使用 Crossref 免费公共 REST API。'
    },
    openalex: {
      enabled: false,
      access: 'not_integrated',
      allowedOrigin: 'https://api.openalex.org',
      paidFallback: false,
      reason: 'OpenAlex 当前未集成；不会配置所有者密钥或付费回退。'
    }
  };

  function frozenProviders() {
    var providers = {};
    Object.keys(PROVIDERS).forEach(function (name) { providers[name] = Object.freeze(Object.assign({}, PROVIDERS[name])); });
    return Object.freeze(providers);
  }

  function createCostPolicy(config) {
    config = config || {};
    var requestedMode = config.COST_MODE || config.costMode || DEFAULT_COST_MODE;
    return Object.freeze({
      mode: DEFAULT_COST_MODE,
      requestedMode: requestedMode,
      forcedZeroCost: requestedMode !== DEFAULT_COST_MODE,
      ownerMonthlyBudget: 0,
      automaticBilling: false,
      allowsPaidFallback: false,
      activeStorage: 'localStorage',
      providers: frozenProviders()
    });
  }

  function policyError(code, message, provider, status) {
    var error = new Error(message);
    error.name = 'ZeroOwnerCostError';
    error.code = code;
    error.provider = provider || '';
    error.status = status || 0;
    error.recoverableLocally = true;
    error.paidFallbackAttempted = false;
    return error;
  }

  function requestPublicJson(provider, endpoint, fetcher) {
    var policy = createCostPolicy();
    var providerPolicy = policy.providers[provider];
    if (!providerPolicy || !providerPolicy.enabled) {
      return Promise.reject(policyError('PROVIDER_NOT_ALLOWED', '该外部服务尚未接入当前版本。', provider));
    }

    var parsed;
    try { parsed = new URL(endpoint); }
    catch (error) { return Promise.reject(policyError('ENDPOINT_NOT_ALLOWED', '公共 API 地址无效；请求已停止。', provider)); }
    if (parsed.origin !== providerPolicy.allowedOrigin || parsed.protocol !== 'https:') {
      return Promise.reject(policyError('ENDPOINT_NOT_ALLOWED', '该数据源地址未通过安全校验。', provider));
    }
    if (typeof fetcher !== 'function') {
      return Promise.reject(policyError('PUBLIC_API_UNAVAILABLE', 'Crossref 请求不可用；可继续手动录入或导入。', provider));
    }

    return Promise.resolve().then(function () {
      return fetcher(parsed.href, { method: 'GET', headers: { Accept: 'application/json' } });
    }).catch(function () {
      throw policyError('PUBLIC_API_UNAVAILABLE', 'Crossref 暂时不可用；可继续手动录入或导入。', provider);
    }).then(function (response) {
      if (!response || !response.ok) {
        var status = response ? Number(response.status || 0) : 0;
        var code = status === 429 ? 'PUBLIC_API_RATE_LIMITED' : 'PUBLIC_API_REJECTED';
        var copy = status === 429 ? 'Crossref 请求过于频繁；请稍后重试，或继续手动录入或导入。' : 'Crossref 未完成请求；请稍后重试，或继续手动录入或导入。';
        throw policyError(code, copy, provider, status);
      }
      return Promise.resolve(response.json()).catch(function () {
        throw policyError('PUBLIC_API_INVALID_RESPONSE', 'Crossref 返回内容无法读取；可继续手动录入或导入。', provider, response.status);
      });
    });
  }

  return {
    DEFAULT_COST_MODE: DEFAULT_COST_MODE,
    createCostPolicy: createCostPolicy,
    requestPublicJson: requestPublicJson
  };
});
