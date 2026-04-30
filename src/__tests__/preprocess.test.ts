import { describe, it, expect } from 'vitest';
import { preprocessForReadability } from '../preprocess.js';

describe('preprocessForReadability — span data-as="p" promotion', () => {
  it('promotes <span data-as="p"> to <p>', () => {
    const html = '<html><body><span data-as="p">hello</span></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toContain('<p>hello</p>');
    expect(out).not.toContain('data-as="p"');
  });

  it('preserves other attributes when promoting (drops only data-as)', () => {
    const html = '<html><body><span data-as="p" class="lead" id="x">hello</span></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<p[^>]*class="lead"[^>]*>hello<\/p>/);
    expect(out).toMatch(/<p[^>]*id="x"[^>]*>hello<\/p>/);
    expect(out).not.toContain('data-as');
  });

  it('promotes nested <span data-as="p">', () => {
    const html = '<html><body><div><span data-as="p"><span>inner</span></span></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<p><span>inner<\/span><\/p>/);
  });

  it('leaves spans without data-as="p" untouched', () => {
    const html = '<html><body><span class="ordinary">hi</span><span data-as="other">x</span></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toContain('<span class="ordinary">hi</span>');
    expect(out).toContain('<span data-as="other">x</span>');
    expect(out).not.toContain('<p>');
  });
});
