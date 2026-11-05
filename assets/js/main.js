/* Fonsekai Archive — interações do site (sem dependências) */
(function () {
  'use strict';

  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---------- Ligações com o HTML gerado por scripts/build_site.py ---------- */
  var dados = { reel: null, projetos: [] };
  try {
    dados = JSON.parse(document.getElementById('dados').textContent);
  } catch (e) {
    console.warn('Não consegui ler os dados dos vídeos', e);
  }

  function videosDoProjeto(i) {
    var p = dados.projetos[i];
    if (!p) return null;
    return {
      titulo: p.titulo,
      videos: (p.videos || []).map(function (v) { return Object.assign({ titulo: p.titulo }, v); })
    };
  }

  // Cards de Trabalhos e o botão do destaque: abrem o projeto inteiro no player.
  document.querySelectorAll('[data-projeto]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var p = videosDoProjeto(Number(botao.getAttribute('data-projeto')));
      if (p && p.videos.length) abrir(p.videos, p.titulo, botao);
    });
  });

  // Reel (só existe no HTML quando há reel em data/site.json).
  var reelBtn = document.querySelector('[data-video="reel"]');
  if (reelBtn && dados.reel) {
    reelBtn.addEventListener('click', function () { abrir([dados.reel], 'Reel', reelBtn); });
  }

  // Filtros por categoria: só escondem/mostram os cards que já estão na página.
  var filtrosEl = document.getElementById('filtros');
  if (filtrosEl) {
    filtrosEl.addEventListener('click', function (ev) {
      var alvo = ev.target.closest('[data-filtro]');
      if (!alvo) return;
      var cat = alvo.getAttribute('data-filtro');
      filtrosEl.querySelectorAll('[data-filtro]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === alvo));
      });
      document.querySelectorAll('#grade .work').forEach(function (card) {
        card.hidden = cat !== 'Todos' && card.getAttribute('data-categoria') !== cat;
      });
    });
  }
})();
