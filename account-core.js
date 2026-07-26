(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathAccount = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ITERATIONS = 210000;

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    var binary = '';
    bytes.forEach(function (value) { binary += String.fromCharCode(value); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
    var binary = atob(value);
    return Uint8Array.from(binary, function (char) { return char.charCodeAt(0); });
  }

  function secureRandom(size) {
    var bytes = new Uint8Array(size);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  async function hashPassword(password, salt) {
    var encoded = new TextEncoder().encode(String(password));
    var key = await globalThis.crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, ['deriveBits']);
    var bits = await globalThis.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt,
      iterations: ITERATIONS
    }, key, 256);
    return bytesToBase64(new Uint8Array(bits));
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  async function createAccount(input) {
    var values = input || {};
    var email = normalizeEmail(values.email);
    var displayName = String(values.displayName || '').trim();
    var password = String(values.password || '');
    if (!displayName) throw new Error('请输入姓名或昵称。');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请输入有效邮箱。');
    if (password.length < 10) throw new Error('密码至少需要 10 个字符。');
    var salt = values.salt instanceof Uint8Array ? values.salt : secureRandom(16);
    return {
      id: values.id || ('account-' + (globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36))),
      displayName: displayName,
      email: email,
      salt: bytesToBase64(salt),
      passwordHash: await hashPassword(password, salt),
      createdAt: values.now || new Date().toISOString()
    };
  }

  async function verifyPassword(account, password) {
    if (!account || !account.salt || !account.passwordHash) return false;
    var hash = await hashPassword(String(password || ''), base64ToBytes(account.salt));
    if (hash.length !== account.passwordHash.length) return false;
    var mismatch = 0;
    for (var index = 0; index < hash.length; index += 1) mismatch |= hash.charCodeAt(index) ^ account.passwordHash.charCodeAt(index);
    return mismatch === 0;
  }

  return {
    ITERATIONS: ITERATIONS,
    normalizeEmail: normalizeEmail,
    createAccount: createAccount,
    verifyPassword: verifyPassword
  };
});
