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
const units = [], ids = new Set(), weeks = [], issues = [];
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
      for (const [, effect] of slide.h.matchAll(/data-fx="([^"]+)"/g)) {
        assert.equal(typeof effects[effect], 'function', `Missing interactive visual ${effect}`);
      }
    }
    units.push(topic);
  }
  units.push({ id: `${block.id}-${week.n}-T`, gens: week.test?.gens || week.topics.flatMap(topic => topic.gens) });
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
let audioFiles = 0, clips = 0;
for (const groups of Object.values(audio)) for (const group of Object.values(groups)) {
  audioFiles++;
  assert(existsSync(resolve(root, 'public/academy/audio', group.file)), `Missing audio ${group.file}`);
  for (const [name, [start, duration]] of Object.entries(group.clips)) {
    clips++;
    assert(Number.isFinite(start) && start >= 0 && Number.isFinite(duration) && duration > 0, `Invalid audio clip ${name}`);
  }
}
console.log(JSON.stringify({ blocks: blocks.length, weeks: weeks.length, units: units.length, slides, generators, questions, interactiveVisuals: Object.keys(effects).length, audioFiles, clips, issues }, null, 2));
if (issues.length) process.exitCode = 1;
