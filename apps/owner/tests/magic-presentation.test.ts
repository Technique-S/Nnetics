import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {compiledTsx} from './fixtures/load-tsx.ts';

const {AnimatedList} = await import(await compiledTsx(new URL('../src/components/ui/animated-list.tsx', import.meta.url)));
test('operational Animated List renders every initial record immediately in supplied chronological order', () => {
  const records = ['Latest record · 12:03', 'Earlier record · 12:02', 'First record · 12:01'];
  const html = renderToStaticMarkup(createElement(AnimatedList, {children: records.map((text, i) => createElement('article', {key: `event-${i}`}, text))}));
  for (const record of records) assert(html.includes(record));
  assert(html.indexOf(records[0]) < html.indexOf(records[1]));
  assert(html.indexOf(records[1]) < html.indexOf(records[2]));
  assert.equal((html.match(/<article/g) || []).length, 3);
});

const {DemoButton} = await import(await compiledTsx(new URL('../src/components/demo/demo-button.tsx', import.meta.url)));
test('the live presentation boundary keeps a single native button with the existing API and no effects', () => {
  const html = renderToStaticMarkup(createElement(DemoButton, {type: 'submit', disabled: true, effect: 'primary', 'aria-label': 'Submit', className: 'button primary', children: 'Submit'}));
  assert.equal(html, '<button class="button primary" type="submit" disabled="" aria-label="Submit">Submit</button>');
});
