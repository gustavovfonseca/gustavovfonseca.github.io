/* Fonsekai Archive — interações do site (sem dependências) */
(function () {
  'use strict';

  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var config = {};

  /* ---------- Vinheta de abertura ---------- */
  var vinheta = document.getElementById('vinheta');
  var barra = document.getElementById('barra');
  var aviso = document.getElementById('cue');

  function mostrarAviso() {
    aviso.hidden = false;
    barra.style.width = '100%';
  }

  if (vinheta) {
    if (calmo) {
      mostrarAviso();
    } else {
      vinheta.muted = true;
      vinheta.addEventListener('timeupdate', function () {
        if (vinheta.duration) {
          barra.style.width = Math.min(100, (vinheta.currentTime / vinheta.duration) * 100) + '%';
        }
      });
      vinheta.addEventListener('ended', mostrarAviso);
      var tentativa = vinheta.play();
      // Se o navegador bloquear a reprodução automática, mostra o aviso mesmo assim.
      if (tentativa && tentativa.catch) tentativa.catch(mostrarAviso);
    }
  }

  /* ---------- Player em janela ---------- */
  var player = document.getElementById('player');
  var caixa = document.getElementById('player-box');
  var fechar = document.getElementById('player-fechar');
  var titulo = document.getElementById('player-titulo');
  var navEl = document.getElementById('player-nav');
  var origem = null;
  var lista = [];
  var atual = 0;

  function ehVertical(formato) {
    return formato === '9:16' || formato === '4:5';
  }

  function classeFormato(formato) {
    if (formato === '1:1') return 'player__box--q';
    return ehVertical(formato) ? 'player__box--v' : 'player__box--h';
  }

  function urlDoVideo(v) {
    var id = encodeURIComponent(v.id);
    if (v.tipo === 'youtube') return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
    if (v.tipo === 'vimeo') return 'https://player.vimeo.com/video/' + id + '?autoplay=1&title=0&byline=0&portrait=0';
    if (v.tipo === 'behance') return 'https://www-ccv.adobe.io/v1/player/ccv/' + id + '/embed?api_key=behance1&bgcolor=%23000000';
    return '';
  }

  function montarVideo(v) {
    caixa.className = 'player__box ' + classeFormato(v && v.formato);
    caixa.textContent = '';

    if (!v || (!v.id && !v.arquivo)) {
      var vazio = document.createElement('p');
      vazio.className = 'player__empty';
      vazio.textContent = 'Este vídeo ainda não foi adicionado.';
      caixa.appendChild(vazio);
      return;
    }

    if (v.tipo === 'arquivo') {
      var el = document.createElement('video');
      el.src = v.arquivo;
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      caixa.appendChild(el);
      return;
    }

    var frame = document.createElement('iframe');
    frame.src = urlDoVideo(v);
    frame.title = v.titulo || 'Vídeo';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    caixa.appendChild(frame);
  }

  function mostrar(i) {
    atual = (i + lista.length) % lista.length;
    montarVideo(lista[atual]);
    Array.prototype.forEach.call(navEl.querySelectorAll('.player__dot'), function (d, n) {
      d.setAttribute('aria-current', n === atual ? 'true' : 'false');
    });
    var contador = navEl.querySelector('.player__count');
    if (contador) contador.textContent = (atual + 1) + ' / ' + lista.length;
  }

  function montarNavegacao() {
    navEl.textContent = '';
    navEl.hidden = lista.length < 2;
    if (lista.length < 2) return;

    var ant = botaoSeta('Vídeo anterior', 'M15 6l-6 6 6 6', function () { mostrar(atual - 1); });
    var prox = botaoSeta('Próximo vídeo', 'M9 6l6 6-6 6', function () { mostrar(atual + 1); });
    var pontos = document.createElement('div');
    pontos.className = 'player__dots';
    lista.forEach(function (v, n) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'player__dot';
      d.setAttribute('aria-label', 'Vídeo ' + (n + 1) + (v.duracao ? ' (' + v.duracao + ')' : ''));
      d.addEventListener('click', function () { mostrar(n); });
      pontos.appendChild(d);
    });
    var contador = document.createElement('span');
    contador.className = 'player__count mono';

    navEl.appendChild(ant);
    navEl.appendChild(pontos);
    navEl.appendChild(contador);
    navEl.appendChild(prox);
  }

  function botaoSeta(rotulo, caminho, acao) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'player__arrow';
    b.setAttribute('aria-label', rotulo);
    b.innerHTML = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + caminho + '"/></svg>';
    b.addEventListener('click', acao);
    return b;
  }

  function abrir(videos, nome, botao) {
    origem = botao || null;
    lista = (videos && videos.length) ? videos : [null];
    titulo.textContent = nome || '';
    montarNavegacao();
    if (typeof player.showModal === 'function') player.showModal();
    else player.setAttribute('open', '');
    mostrar(0);
    fechar.focus();
  }

  function aoFechar() {
    caixa.textContent = ''; // para o vídeo
    if (origem) origem.focus();
  }

  fechar.addEventListener('click', function () { player.close(); });
  player.addEventListener('close', aoFechar);
  player.addEventListener('click', function (e) {
    if (e.target === player) player.close(); // clique fora do vídeo
  });
  player.addEventListener('keydown', function (e) {
    if (lista.length < 2) return;
    if (e.key === 'ArrowRight') { mostrar(atual + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { mostrar(atual - 1); e.preventDefault(); }
  });

  /* ---------- Configurações gerais (data/site.json) ---------- */
  function aplicarConfig() {
    var reelBtn = document.querySelector('[data-video="reel"]');
    if (config.reel && (config.reel.id || config.reel.arquivo)) {
      reelBtn.hidden = false;
      reelBtn.addEventListener('click', function () {
        abrir([config.reel], 'Reel', reelBtn);
      });
    }

    var destaqueBtn = document.querySelector('[data-video="destaque"]');
    destaqueBtn.addEventListener('click', function () {
      var d = config.destaque || null;
      abrir(d ? [d] : null, d && d.titulo, destaqueBtn);
    });

    var zap = document.getElementById('whatsapp');
    var numero = String(config.whatsapp || '').replace(/\D/g, '');
    if (numero) {
      zap.href = 'https://wa.me/' + numero;
      zap.hidden = false;
    }
  }

  /* ---------- Trabalhos (data/projetos.json) ---------- */
  var filtrosEl = document.getElementById('filtros');
  var gradeEl = document.getElementById('grade');
  var projetos = [];
  var categoriaAtual = 'Todos';

  function formatos(p) {
    var f = [];
    (p.videos || []).forEach(function (v) { if (v.formato && f.indexOf(v.formato) === -1) f.push(v.formato); });
    return f.join(' · ');
  }

  function criarCard(p) {
    var item = document.createElement('article');
    item.className = 'work';

    var qtd = (p.videos || []).length;
    var tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'work__tile';
    tile.setAttribute('aria-label', 'Assistir ' + p.titulo + (qtd > 1 ? ' (' + qtd + ' vídeos)' : ''));

    if (p.capa) {
      var img = document.createElement('img');
      img.className = 'work__media';
      img.src = p.capa;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.onerror = function () { img.remove(); }; // sem capa, fica o fundo violeta
      tile.appendChild(img);
    }

    var topo = document.createElement('span');
    topo.className = 'work__top';
    var cat = document.createElement('span');
    cat.className = 'work__cat';
    cat.textContent = p.categoria.toUpperCase();
    topo.appendChild(cat);
    if (qtd > 1) {
      var n = document.createElement('span');
      n.className = 'work__count';
      n.textContent = qtd + ' vídeos';
      topo.appendChild(n);
    }

    var play = document.createElement('span');
    play.className = 'play';
    play.setAttribute('aria-hidden', 'true');
    play.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#000"/></svg>';

    var fmt = document.createElement('span');
    fmt.className = 'work__fmt';
    fmt.textContent = formatos(p);

    tile.appendChild(topo);
    tile.appendChild(play);
    tile.appendChild(fmt);
    if (qtd === 0 && p.behance) {
      // Projeto novo, ainda sem vídeos cadastrados: abre a página dele no Behance.
      tile.setAttribute('aria-label', 'Ver ' + p.titulo + ' no Behance (abre em nova aba)');
      fmt.textContent = 'Ver no Behance ↗';
      play.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>';
      tile.addEventListener('click', function () { window.open(p.behance, '_blank', 'noopener'); });
    } else {
      tile.addEventListener('click', function () {
        var vids = (p.videos || []).map(function (v) { return Object.assign({ titulo: p.titulo }, v); });
        abrir(vids, p.titulo, tile);
      });
    }

    var corpo = document.createElement('div');
    corpo.className = 'work__body';
    var h = document.createElement('h3');
    h.className = 'work__title';
    h.textContent = p.titulo;
    corpo.appendChild(h);
    if (p.descricao) {
      var d = document.createElement('p');
      d.className = 'work__desc';
      d.textContent = p.descricao;
      corpo.appendChild(d);
    }
    if (p.ferramentas && p.ferramentas.length) {
      var t = document.createElement('p');
      t.className = 'work__tools mono';
      t.textContent = p.ferramentas.join(' · ');
      corpo.appendChild(t);
    }

    item.appendChild(tile);
    item.appendChild(corpo);
    return item;
  }

  function renderizarGrade() {
    gradeEl.textContent = '';
    projetos
      .filter(function (p) { return categoriaAtual === 'Todos' || p.categoria === categoriaAtual; })
      .forEach(function (p) { gradeEl.appendChild(criarCard(p)); });
  }

  function renderizarFiltros() {
    var cats = ['Todos'];
    projetos.forEach(function (p) { if (cats.indexOf(p.categoria) === -1) cats.push(p.categoria); });
    filtrosEl.textContent = '';
    filtrosEl.hidden = cats.length < 3;
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter';
      b.textContent = c;
      b.setAttribute('aria-pressed', String(c === categoriaAtual));
      b.addEventListener('click', function () {
        categoriaAtual = c;
        Array.prototype.forEach.call(filtrosEl.children, function (x) {
          x.setAttribute('aria-pressed', String(x.textContent === c));
        });
        renderizarGrade();
      });
      filtrosEl.appendChild(b);
    });
  }

  function carregar(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    });
  }

  carregar('data/site.json')
    .then(function (c) { config = c || {}; })
    .catch(function (e) { console.warn('Não consegui ler site.json', e); })
    .then(aplicarConfig);

  carregar('data/projetos.json')
    .then(function (itens) {
      projetos = (itens || []).filter(function (p) { return p && p.titulo && p.categoria && !p.oculto; });
      var total = projetos.reduce(function (s, p) { return s + (p.videos || []).length; }, 0);
      var totalEl = document.getElementById('total-videos');
      if (totalEl && total) totalEl.textContent = total;
      renderizarFiltros();
      renderizarGrade();
    })
    .catch(function (e) {
      console.warn('Não consegui ler projetos.json', e);
      gradeEl.innerHTML = '<p class="muted">Não foi possível carregar os trabalhos agora.</p>';
    });

  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();
})();
