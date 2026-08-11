(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathVisualStoryV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var manifestPromise;
  var PHASES = [
    { id: 'orient', label: '界定问题' },
    { id: 'search', label: '检索筛选' },
    { id: 'evidence', label: '提取证据' },
    { id: 'synthesize', label: '综合确认' },
    { id: 'deliver', label: '交付回流' }
  ];

  function load() {
    if (!manifestPromise) {
      manifestPromise = fetch('assets/story-v3/manifest.json', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('视觉故事清单加载失败');
          return response.json();
        })
        .then(function (manifest) {
          if (!manifest || manifest.version !== 3 || !Array.isArray(manifest.assets) || manifest.assets.length < 50) {
            throw new Error('视觉故事清单不完整');
          }
          return manifest;
        });
    }
    return manifestPromise;
  }

  function phaseLabel(id) {
    var phase = PHASES.filter(function (item) { return item.id === id; })[0];
    return phase ? phase.label : '研究现场';
  }

  return { PHASES: PHASES, load: load, phaseLabel: phaseLabel };
});
