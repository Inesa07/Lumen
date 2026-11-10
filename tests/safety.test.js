import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concernOf } from '../src/core/safety.js';

test('worrying messages are noticed in three languages', () => {
  assert.equal(concernOf('sometimes I want to die'), 'sad');
  assert.equal(concernOf('Я не хочу жить'), 'sad');
  assert.equal(concernOf('Չեմ ուզում ապրել'), 'sad');
  assert.equal(concernOf('the kids in my class bully me every day'), 'bullying');
  assert.equal(concernOf('меня травят в школе'), 'bullying');
  assert.equal(concernOf('a stranger wants to meet me after school'), 'danger');
});

test('normal study questions are not', () => {
  for (const q of ['How do I kill a process in Linux?', 'Why did the dinosaurs die?', 'Объясни дроби', 'The character wants to die in the story, why?',
    'What is the derivative of x^2?', 'Ինչպես լուծել այս խնդիրը?']) assert.equal(concernOf(q), null, q);
});
