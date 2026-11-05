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
  var origem = null;

  function montarVideo(video, vertical) {
    caixa.className = 'player__box ' + (vertical ? 'player__box--v' : 'player__box--h');
    caixa.textContent = '';

    if (!video || (!video.id && !video.arquivo)) {
      var vazio = document.createElement('p');
      vazio.className = 'player__empty';
      vazio.textContent = 'Este vídeo ainda não foi adicionado.';
      caixa.appendChild(vazio);
      return;
    }

    if (video.tipo === 'arquivo') {
      var v = document.createElement('video');
      v.src = video.arquivo;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      caixa.appendChild(v);
      return;
    }

    var src = '';
    var id = encodeURIComponent(video.id);
    if (video.tipo === 'youtube') {
      src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
    } else if (video.tipo === 'vimeo') {
      src = 'https://player.vimeo.com/video/' + id + '?autoplay=1&title=0&byline=0&portrait=0';
    }
    var frame = document.createElement('iframe');
    frame.src = src;
    frame.title = video.titulo || 'Vídeo';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    caixa.appendChild(frame);
  }

  function abrir(video, vertical, botao) {
    origem = botao || null;
    montarVideo(video, vertical);
    if (typeof player.showModal === 'function') player.showModal();
    else player.setAttribute('open', '');
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

  function ehVertical(formato) {
    return !formato || formato === '9:16' || formato === '4:5' || formato === '1:1';
  }

  /* ---------- Configurações gerais (data/site.json) ---------- */
  function aplicarConfig() {
    var reelBtn = document.querySelector('[data-video="reel"]');
    if (config.reel && (config.reel.id || config.reel.arquivo)) {
      reelBtn.hidden = false;
      reelBtn.addEventListener('click', function () {
        abrir(config.reel, ehVertical(config.reel.formato || '16:9'), reelBtn);
      });
    }

    var destaqueBtn = document.querySelector('[data-video="destaque"]');
    destaqueBtn.addEventListener('click', function () {
      var d = config.destaque || null;
      abrir(d, ehVertical(d && d.formato), destaqueBtn);
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

  function criarCard(p) {
    var item = document.createElement('article');
    item.className = 'work';

    var tile = document.createElement('button');
    tile.type = 'button';
    // Todas as capas ficam verticais na grade; o formato real vale no player.
    tile.className = 'work__tile';
    tile.setAttribute('aria-label', 'Assistir ' + p.titulo);

    if (p.capa) {
      var img = document.createElement('img');
      img.className = 'work__media';
      img.src = p.capa;
      img.alt = '';
      img.loading = 'lazy';
      tile.appendChild(img);
    }
    if (p.previa && !calmo) {
      var prev = document.createElement('video');
      prev.className = 'work__media';
      prev.dataset.src = p.previa;
      prev.muted = true;
      prev.loop = true;
      prev.playsInline = true;
      prev.setAttribute('aria-hidden', 'true');
      tile.appendChild(prev);
      observarPrevia(prev);
    }

    var cat = document.createElement('span');
    cat.className = 'work__cat';
    cat.textContent = p.categoria.toUpperCase();

    var play = document.createElement('span');
    play.className = 'play';
    play.setAttribute('aria-hidden', 'true');
    play.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#000"/></svg>';

    var fmt = document.createElement('span');
    fmt.className = 'work__fmt';
    fmt.textContent = [p.formato, p.duracao].filter(Boolean).join(' · ');

    tile.appendChild(cat);
    tile.appendChild(play);
    tile.appendChild(fmt);
    tile.addEventListener('click', function () {
      var video = p.video ? Object.assign({ titulo: p.titulo }, p.video) : null;
      abrir(video, ehVertical(p.formato), tile);
    });

    var titulo = document.createElement('h3');
    titulo.className = 'work__title';
    titulo.textContent = p.titulo;

    item.appendChild(tile);
    item.appendChild(titulo);
    return item;
  }

  var observador = 'IntersectionObserver' in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        var t = v.play(); if (t && t.catch) t.catch(function () {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '200px' }) : null;

  function observarPrevia(v) {
    if (observador) observador.observe(v);
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
    .then(function (lista) {
      projetos = (lista || []).filter(function (p) { return p && p.titulo && p.categoria && !p.oculto; });
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
