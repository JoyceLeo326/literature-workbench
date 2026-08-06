const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('ships a complete six-chapter visual research story', () => {
  const corePath = path.join(root, 'story-core.js');
  assert.equal(fs.existsSync(corePath), true, 'story-core.js must exist');
  const story = require(corePath);

  assert.equal(story.CHAPTERS.length, 6);
  assert.equal(story.SCENES.length, 24);
  assert.equal(new Set(story.SCENES.map((scene) => scene.id)).size, 24);
  assert.equal(new Set(story.SCENES.map((scene) => scene.asset)).size, 24);

  for (const chapter of story.CHAPTERS) {
    assert.equal(story.SCENES.filter((scene) => scene.chapter === chapter.id).length, 4);
  }
  for (const scene of story.SCENES) {
    assert.ok(scene.title.length >= 4);
    assert.ok(scene.copy.length >= 18);
    assert.ok(scene.alt.length >= 12);
    assert.match(scene.asset, /^assets\/story\/wenjing-\d{2}-[a-z-]+\.webp$/);
    const file = path.join(root, scene.asset);
    assert.equal(fs.existsSync(file), true, `${scene.asset} must exist`);
    const bytes = fs.statSync(file).size;
    assert.ok(bytes > 20_000 && bytes < 300_000, `${scene.asset} must be web-ready`);
  }
});

test('research profile and review feedback causally change the next chapter', () => {
  const story = require(path.join(root, 'story-core.js'));
  const novice = { researchStage: 'coursework', deliveryGoal: 'class-report', weeklyHours: 3 };
  const advanced = { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 12 };

  assert.notEqual(
    story.recommendedChapter(novice, null, { total: 0, verified: 0 }).id,
    story.recommendedChapter(advanced, null, { total: 18, verified: 15 }).id
  );
  assert.equal(story.recommendedChapter(novice, { signal: 'scope-too-broad' }, {}).id, 'orient');
  assert.equal(story.recommendedChapter(novice, { signal: 'missing-sources' }, {}).id, 'screen');
  assert.equal(story.recommendedChapter(novice, { signal: 'claim-too-strong' }, {}).id, 'evidence');
  assert.equal(story.recommendedChapter(novice, { signal: 'synthesis-unclear' }, {}).id, 'synthesize');
  assert.equal(story.recommendedChapter(novice, { signal: 'handoff-hard' }, {}).id, 'deliver');
  assert.equal(story.recommendedChapter(novice, { signal: 'worked' }, {}).id, 'continue');

  const move = story.nextMove({ signal: 'missing-sources', note: '英文证据不足' });
  assert.equal(move.view, 'queries');
  assert.equal(move.sceneId, 'wenjing-05');
  assert.match(move.copy, /英文证据不足/);
});

test('integrates the brand, story controls, feedback loop, and static release', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const build = fs.readFileSync(path.join(root, 'scripts', 'build-pages.mjs'), 'utf8');
  const mark = fs.readFileSync(path.join(root, 'assets', 'brand', 'wenjing-mark.svg'), 'utf8');

  for (const marker of [
    'data-story-gallery',
    'data-story-image',
    'data-story-chapters',
    'data-story-scenes',
    'data-story-feedback-form',
    'data-story-feedback',
    'data-story-next-action'
  ]) assert.match(html, new RegExp(marker));

  assert.match(html, /src="story-core\.js"/);
  assert.match(html, /assets\/brand\/wenjing-mark\.svg/);
  assert.match(script, /LitpathStory/);
  assert.match(script, /reviewFeedback/);
  assert.match(script, /renderStory/);
  assert.match(css, /\.story-control[\s\S]*min-height:\s*44px/);
  assert.match(build, /story-core\.js/);
  assert.match(mark, /<title(?: [^>]*)?>文径品牌标志<\/title>/);
  assert.match(mark, /<desc(?: [^>]*)?>/);
  assert.equal(fs.existsSync(path.join(root, 'assets', 'brand', 'wenjing-brandkit-v1.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'docs', 'visual-identity.md')), true);
});

test('keeps empty project targets truthful in the overview', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(html, /data-overview-title/);
  assert.match(script, /setProgress\('\[data-total-progress\]', totalTarget \?[^:]+: 0\)/);
  assert.match(script, /尚未设置中文目标/);
  assert.match(script, /尚未设置英文目标/);
  assert.match(script, /把散落的文献，整理成一套可复查的研究底稿/);
});
