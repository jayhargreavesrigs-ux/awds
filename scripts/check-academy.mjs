import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/academy/academy.js'), 'utf8');
const marker = '/* AWDS Academy — course runner:';
assert(source.includes(marker), 'Course runner boundary not found');
let seed = 20261011;
const math = Object.create(Math);
math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const context = vm.createContext({ window: {}, Math: math, console });
vm.runInContext(source.slice(0, source.indexOf(marker)), context, { timeout: 10000 });
const { AWDS_BLOCKS: blocks, AWDS_FX: effects, AWDS_AUDIO: audio } = context.window;
const units = [], ids = new Set(), weeks = [], issues = [], narrationKeys = new Set(['preview']);
let slides = 0, generators = 0, questions = 0;
for (const block of blocks) for (const week of block.weeks) {
  weeks.push(week.n);
  for (const topic of week.topics) {
    assert(!ids.has(topic.id), `Duplicate topic ${topic.id}`);
    ids.add(topic.id);
    assert(topic.slides.length, `No slides in ${topic.id}`);
    for (const slide of topic.slides) {
      slides++;
      assert(slide.t && typeof slide.h === 'string', `Incomplete slide in ${topic.id}`);
      narrationKeys.add(`${topic.id}|${slide.t}`);
      for (const [, effect] of slide.h.matchAll(/data-fx="([^"]+)"/g)) {
        assert.equal(typeof effects[effect], 'function', `Missing interactive visual ${effect}`);
      }
    }
    units.push(topic);
  }
  units.push({ id: `${block.id}-${week.n}-T`, gens: week.test?.gens || week.topics.flatMap(topic => topic.gens) });
  narrationKeys.add(`${block.id}-${week.n}-T|${week.test?.title || `Week ${week.n} test`}`);
}
assert.deepEqual(weeks, Array.from({ length: 52 }, (_, i) => i + 1));
for (const unit of units) {
  assert(unit.gens?.length, `No question generators for ${unit.id}`);
  for (const [index, generator] of unit.gens.entries()) {
    generators++;
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        const question = generator(); questions++;
        assert(question.q && !/\b(?:NaN|undefined|Infinity)\b/.test(question.q), 'Invalid question text');
        if (question.type === 'num') assert(Number.isFinite(question.ans), 'Non-finite numeric answer');
        else {
          assert.equal(question.type, 'mcq');
          assert(Number.isInteger(question.ans) && question.ans >= 0 && question.ans < question.opts.length, 'Invalid answer index');
          assert.equal(new Set(question.opts).size, question.opts.length, 'Duplicate multiple-choice options');
        }
      } catch (error) {
        issues.push({ unit: unit.id, generator: index, error: error.message });
        break;
      }
    }
  }
}
// Read MP4 metadata so an older, shorter audio pack cannot silently truncate clips.
function recordedDuration(path) {
  const data = readFileSync(path);
  let duration, audioTracks = 0;
  function boxes(start, end) {
    let offset = start;
    while (offset + 8 <= end) {
      let size = data.readUInt32BE(offset), header = 8;
      const type = data.toString('ascii', offset + 4, offset + 8);
      if (size === 1) { size = Number(data.readBigUInt64BE(offset + 8)); header = 16; }
      if (size === 0) size = end - offset;
      assert(size >= header && offset + size <= end, `Invalid media box in ${path}`);
      const content = offset + header;
      if (['moov', 'trak', 'mdia'].includes(type)) boxes(content, offset + size);
      if (type === 'mvhd') {
        const version = data[content];
        assert(version === 0 || version === 1, `Unsupported media version in ${path}`);
        const scaleAt = content + (version === 1 ? 20 : 12);
        const scale = data.readUInt32BE(scaleAt);
        const ticks = version === 1 ? Number(data.readBigUInt64BE(scaleAt + 4)) : data.readUInt32BE(scaleAt + 4);
        duration = ticks / scale;
      }
      if (type === 'hdlr' && data.toString('ascii', content + 8, content + 12) === 'soun') audioTracks++;
      offset += size;
    }
  }
  boxes(0, data.length);
  assert(audioTracks > 0 && Number.isFinite(duration) && duration > 0, `Missing playable audio metadata in ${path}`);
  return duration;
}

let audioFiles = 0, clips = 0;
const voiceKeys = new Map();
assert.deepEqual(Object.keys(audio).sort(), ['gb-f', 'gb-m', 'us-f', 'us-m']);
for (const [voice, groups] of Object.entries(audio)) {
  const keys = new Set();
  voiceKeys.set(voice, keys);
  for (const group of Object.values(groups)) {
    audioFiles++;
    assert(/^(gb|us)-(f|m)\/[A-Za-z0-9_-]+\.mp4$/.test(group.file), `Unexpected media path ${group.file}`);
    const path = resolve(root, 'public/academy/audio', group.file);
    assert(existsSync(path), `Missing audio ${group.file}`);
    const duration = recordedDuration(path);
    for (const [name, [start, length]] of Object.entries(group.clips)) {
      clips++;
      assert(Number.isFinite(start) && start >= 0 && Number.isFinite(length) && length > 0, `Invalid audio clip ${name}`);
      assert(!keys.has(name), `Duplicate ${voice} narration key ${name}`);
      assert(start + length <= duration + 0.05, `Audio clip exceeds ${group.file}: ${name}`);
      keys.add(name);
    }
  }
  for (const key of narrationKeys) assert(keys.has(key), `Missing ${voice} narration for ${key}`);
}
for (const [voice, keys] of voiceKeys) assert.deepEqual([...keys].sort(), [...voiceKeys.get('gb-m')].sort(), `Incomplete animation/lesson narration for ${voice}`);
console.log(JSON.stringify({ blocks: blocks.length, weeks: weeks.length, units: units.length, slides, generators, questions, interactiveVisuals: Object.keys(effects).length, audioFiles, clips, issues }, null, 2));
if (issues.length) process.exitCode = 1;
