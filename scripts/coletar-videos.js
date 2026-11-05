// Coleta os vídeos de todos os projetos do Behance, na ordem em que aparecem.
//
// Como usar: abra https://www.behance.net/gustavofonseca37 no navegador do
// computador, abra o console (F12 → Console), cole este código e aperte Enter.
// O resultado vai para a área de transferência; cole no campo "videos" ao rodar
// o workflow "Sincronizar com o Behance" no GitHub.
(async () => {
  const usuario = location.pathname.split('/')[1] || 'gustavofonseca37';
  const rss = await fetch(`/feeds/user?username=${usuario}`).then(r => r.text());
  const links = [...rss.matchAll(/<link><!\[CDATA\[(https:\/\/www\.behance\.net\/gallery\/(\d+)\/[^\]]+)\]\]>/g)];
  const formato = pb => (pb > 150 ? '9:16' : pb > 90 ? '1:1' : '16:9');
  const resultado = {};

  for (const [, url, id] of links) {
    const html = await fetch(url).then(r => r.text());
    const estado = html.match(/<script[^>]*id="beconfig-store_state"[^>]*>([\s\S]*?)<\/script>/);
    if (!estado) { console.warn('Não consegui ler', url); continue; }
    const achar = (o, d = 0) => {
      if (!o || typeof o !== 'object' || d > 12) return null;
      if (Array.isArray(o.modules) && o.name) return o;
      for (const k in o) { const r = achar(o[k], d + 1); if (r) return r; }
      return null;
    };
    const projeto = achar(JSON.parse(estado[1]));
    resultado[id] = (projeto ? projeto.modules : []).map(m => {
      const embed = m.embed || m.fluidEmbed || '';
      const src = (embed.match(/src="([^"]+)"/) || [])[1] || '';
      const pb = parseFloat((embed.match(/padding-bottom:\s*([\d.]+)%/) || [])[1] || '56.25');
      const ccv = src.match(/ccv\/([^/]+)\/embed/);
      const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([^?"]+)/);
      const vm = src.match(/player\.vimeo\.com\/video\/(\d+)/);
      if (ccv) return { tipo: 'behance', id: ccv[1], formato: formato(pb) };
      if (yt) return { tipo: 'youtube', id: yt[1], formato: formato(pb) };
      if (vm) return { tipo: 'vimeo', id: vm[1], formato: formato(pb) };
      return null;
    }).filter(Boolean);
    console.log(`${projeto ? projeto.name : id}: ${resultado[id].length} vídeos`);
  }

  const texto = JSON.stringify(resultado);
  try { copy(texto); console.log('Copiado! Cole no campo "videos" do workflow.'); }
  catch (e) { console.log(texto); }
  return resultado;
})();
