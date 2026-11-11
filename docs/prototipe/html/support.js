// Shim lokal sederhana untuk merender berkas *.dc.html di luar platform desain.
// Hanya untuk melihat prototipe di browser. Bukan bagian dari aplikasi.
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; this._r = null; }
  setState(p, cb) { this.state = Object.assign({}, this.state, p); if (this._r) this._r(); if (typeof cb === 'function') setTimeout(cb, 0); }
}
window.DCLogic = DCLogic;
document.addEventListener('DOMContentLoaded', async () => {
  // Perlu dibuka lewat http (mis. python -m http.server), bukan file://, karena berkas dibaca ulang
  // supaya sc-for/sc-if di dalam <table> tidak dipindahkan oleh parser HTML.
  const raw = await (await fetch(location.href.split('#')[0])).text();
  const fixed = raw.replace(/<sc-for\b/g, '<template data-sc="for"').replace(/<\/sc-for>/g, '</template>')
    .replace(/<sc-if\b/g, '<template data-sc="if"').replace(/<\/sc-if>/g, '</template>');
  const pdoc = new DOMParser().parseFromString(fixed, 'text/html');
  const root = document.querySelector('x-dc');
  const code = pdoc.querySelector('script[data-dc-script]').textContent;
  const Component = new Function(code + '; return Component;')();
  const inst = new Component({});
  const helmet = pdoc.querySelector('x-dc helmet');
  if (helmet) { [...helmet.childNodes].forEach(n => document.head.appendChild(n.cloneNode(true))); helmet.remove(); }
  const tpl = pdoc.querySelector('x-dc');
  const get = (path, scope) => path.trim().split('.').reduce((o, k) => (o == null ? o : o[k]), scope);
  const ev = (s, scope) => { const m = /^\{\{(.*)\}\}$/.exec(s.trim()); if (!m) return undefined; const e = m[1].trim(); if (e === 'true') return true; if (e === 'false') return false; return get(e, scope); };
  const interp = (s, scope) => s.replace(/\{\{([^}]*)\}\}/g, (_, e) => { const v = get(e, scope); return v == null ? '' : v; });
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    let tag = node.tagName.toLowerCase();
    if (tag === 'template') tag = 'sc-' + node.getAttribute('data-sc');
    const kids = tag.startsWith('sc-') ? node.content.childNodes : node.childNodes;
    if (tag === 'sc-for') {
      const list = ev(node.getAttribute('list'), scope) || [];
      const as = node.getAttribute('as');
      list.forEach(item => { const s2 = Object.assign({}, scope, { [as]: item }); kids.forEach(c => build(c, s2, out)); });
      return;
    }
    if (tag === 'sc-if') {
      if (ev(node.getAttribute('value'), scope)) kids.forEach(c => build(c, scope, out));
      return;
    }
    const el = document.createElementNS(node.namespaceURI, node.localName);
    for (const a of node.attributes) {
      if (a.name === 'hint-placeholder-val' || a.name === 'hint-placeholder-count') continue;
      if (/^on/i.test(a.name)) { const fn = ev(a.value, scope); if (typeof fn === 'function') { let t = a.name.slice(2).toLowerCase(); if (t === 'change' && (tag === 'input' || tag === 'textarea')) t = 'input'; el.addEventListener(t, fn); } continue; }
      if (/^(readonly|disabled|checked|hidden|selected|required)$/i.test(a.name)) { const bv = ev(a.value, scope); if (bv !== undefined) { if (bv) el.setAttribute(a.name, ''); continue; } }
      const v = interp(a.value, scope);
      try { el.setAttribute(a.name, v); } catch (e) {}
    }
    node.childNodes.forEach(c => build(c, scope, el));
    out.appendChild(el);
  }
  function render() {
    const ae = document.activeElement; const aid = ae && ae.id; const ss = ae && ae.selectionStart; const se = ae && ae.selectionEnd;
    const vals = inst.renderVals();
    const holder = document.createElement('div');
    tpl.childNodes.forEach(c => build(c, vals, holder));
    root.replaceChildren(...holder.childNodes);
    if (aid) { const n = document.getElementById(aid); if (n) { n.focus(); try { if (ss != null) n.setSelectionRange(ss, se); } catch (e) {} } }
  }
  inst._r = render;
  render();
});
