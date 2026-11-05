import assert from 'node:assert/strict';
import test from 'node:test';

import { demoMessages, demoProjects } from '../src/data/demo';

test('demo workspace uses stable, distinct sample projects', () => {
  assert.equal(demoProjects.length, 3);
  assert.equal(new Set(demoProjects.map((project) => project.id)).size, demoProjects.length);
  assert.ok(demoProjects.every((project) => project.id.startsWith('project-')));
});

test('demo welcome message explicitly discloses that model inference is not performed', () => {
  assert.equal(demoMessages.length, 1);
  const welcome = demoMessages[0].content.toLowerCase();
  assert.match(welcome, /демонстрационном режиме/);
  assert.match(welcome, /не генерируются моделью/);
  assert.match(welcome, /не анализировались/);
});
