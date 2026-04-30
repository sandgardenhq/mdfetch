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

describe('preprocessForReadability — img wrapping in <figure>', () => {
  it('wraps an <img> with alt text in a <figure>', () => {
    const html = '<html><body><div class="content"><img src="/a.jpg" alt="something"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure>/);
  });

  it('wraps an <img> with empty alt in a <figure>', () => {
    const html = '<html><body><div><img src="/a.jpg" alt=""></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure>/);
  });

  it('wraps an <img> with no alt attribute in a <figure>', () => {
    const html = '<html><body><div><img src="/a.jpg"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure>/);
  });

  it('skips <img> inside <nav>', () => {
    const html = '<html><body><nav><img src="/n.jpg" alt="nav"></nav></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
    expect(out).toContain('<img src="/n.jpg" alt="nav">');
  });

  it('skips <img> inside <header>', () => {
    const html = '<html><body><header><img src="/h.jpg" alt="hdr"></header></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> inside <aside>', () => {
    const html = '<html><body><aside><img src="/a.jpg" alt="side"></aside></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> inside <footer>', () => {
    const html = '<html><body><footer><img src="/f.jpg" alt="foot"></footer></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> with class "logo"', () => {
    const html = '<html><body><div><img src="/l.jpg" class="logo" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> with class containing "icon" as a word', () => {
    const html = '<html><body><div><img src="/i.jpg" class="code-block-icon" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> with class "user-avatar"', () => {
    const html = '<html><body><div><img src="/u.jpg" class="user-avatar" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> with class "sprite-foo"', () => {
    const html = '<html><body><div><img src="/s.jpg" class="sprite-foo" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('skips <img> when an ancestor has class "nav-logo"', () => {
    const html = '<html><body><div class="nav-logo"><img src="/n.jpg" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('does not skip when class only contains "iconic" (not a whole-word match)', () => {
    const html = '<html><body><div><img src="/q.jpg" class="iconic-style" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<figure><img[^>]+src="\/q\.jpg"[^>]*><\/figure>/);
  });

  it('does not skip when class only contains "logograph" (not a whole-word match)', () => {
    const html = '<html><body><div><img src="/q.jpg" class="logograph" alt="x"></div></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<figure><img[^>]+src="\/q\.jpg"[^>]*><\/figure>/);
  });

  it('does not double-wrap an <img> already inside a <figure>', () => {
    const html = '<html><body><figure><img src="/f.jpg" alt="x"></figure></body></html>';
    const out = preprocessForReadability(html);
    expect(out.match(/<figure>/g)?.length ?? 0).toBe(1);
  });

  it('does not wrap an <img> inside a <picture>', () => {
    const html = '<html><body><picture><img src="/p.jpg" alt="x"></picture></body></html>';
    const out = preprocessForReadability(html);
    expect(out).not.toContain('<figure>');
  });

  it('wraps multiple eligible images independently', () => {
    const html = '<html><body><div><img src="/a.jpg" alt="a"><img src="/b.jpg" alt="b"></div></body></html>';
    const out = preprocessForReadability(html);
    expect((out.match(/<figure><img/g) || []).length).toBe(2);
  });

  it('lifts the figure out of an otherwise-empty span/div/p wrapper chain', () => {
    const html = '<html><body><main><div><p><span><span><img src="/a.jpg" alt="x"></span></span></p></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<main><figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure><\/main>/);
  });

  it('does not lift past a wrapper that has sibling text', () => {
    const html = '<html><body><main><p>caption text <img src="/a.jpg" alt="x"></p></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<p>caption text <figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure><\/p>/);
  });

  it('does not lift past a wrapper that has sibling element children', () => {
    const html = '<html><body><main><div><img src="/a.jpg" alt="x"><span>more</span></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<div><figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure><span>more<\/span><\/div>/);
  });

  it('lifts past a div whose class would normally be pruned by Readability (overflow-hidden)', () => {
    const html = '<html><body><main><div class="relative overflow-hidden"><span><img src="/a.jpg" alt="x"></span></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<main><figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure><\/main>/);
  });

  it('lifts past wrappers whose only other children are empty decorative elements', () => {
    const html = '<html><body><main><div class="overflow-hidden"><div class="bg-overlay"></div><span><img src="/a.jpg" alt="x"></span><div class="border-overlay"></div></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toMatch(/<main><figure><img[^>]+src="\/a\.jpg"[^>]*><\/figure><\/main>/);
  });

  it('does not strip a sibling that contains text', () => {
    const html = '<html><body><main><div><span>caption</span><img src="/a.jpg" alt="x"></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toContain('<span>caption</span>');
    expect(out).toContain('<figure>');
  });

  it('does not strip a sibling that contains its own image', () => {
    const html = '<html><body><main><div><div><img src="/sibling.jpg" alt="s"></div><img src="/a.jpg" alt="x"></div></main></body></html>';
    const out = preprocessForReadability(html);
    expect(out).toContain('src="/sibling.jpg"');
    expect(out).toContain('src="/a.jpg"');
  });
});
