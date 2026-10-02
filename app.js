var API = 'https://music.cc-home.top/163/api';
var $ = function (s) { return document.querySelector(s); };
var PLAY = '\u25B6\uFE0E', PAUSE = '\u275A\u275A';
function get(k, d) { try { var v = JSON.parse(localStorage.getItem('nc_' + k)); return v == null ? d : v; } catch (e) { return d; } }
function put(k, v) { try { localStorage.setItem('nc_' + k, JSON.stringify(v)); } catch (e) {} }
function fmt(ms) { var s = Math.floor(Math.max(0, ms) / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function getJSON(u) { return fetch(u).then(function (r) { return r.json(); }); }

// 花瓣、开屏星光、音量条
var i, el;
for (i = 0; i < 12; i++) {
  el = document.createElement('div'); el.className = 'petal';
  el.style.left = Math.random() * 100 + 'vw';
  el.style.animationDuration = (10 + Math.random() * 10) + 's';
  el.style.animationDelay = (-Math.random() * 15) + 's';
  document.body.appendChild(el);
}
[[22, 36], [73, 38], [50, 49], [12, 62], [88, 58], [50, 90]].forEach(function (p, k) {
  var s = document.createElement('div'); s.className = 'spark';
  s.style.left = p[0] + '%'; s.style.top = p[1] + '%';
  s.style.animationDelay = (2.6 + k * 0.4) + 's';
  $('#splash').appendChild(s);
});
for (i = 0; i < 14; i++) { el = document.createElement('i'); el.style.animationDelay = (-Math.random()) + 's'; $('#bars').appendChild(el); }

var d = new Date();
$('#date').textContent = String(d.getMonth() + 1).padStart(2, '0') + '月' + String(d.getDate()).padStart(2, '0') + '日 · 星期' + '日一二三四五六'[d.getDay()];

// 开屏 → 主页
var entered = false;
function enter() {
  if (entered) return; entered = true;
  $('#splash').classList.add('out'); $('#home').classList.add('on'); $('#nav').classList.add('on');
  setTimeout(function () { var s = $('#splash'); if (s) s.remove(); }, 1300);
}
$('#splash').addEventListener('click', enter);

// 头像：点圆圈换照片，存在本机
var avatars = get('avatars', {});
function paintAv() {
  ['cici', 'cedric'].forEach(function (w) {
    if (avatars[w]) { var e = $('#ph-' + w); e.style.backgroundImage = 'url(' + avatars[w] + ')'; e.textContent = ''; }
  });
}
paintAv();
var who = null;
document.querySelectorAll('.av').forEach(function (a) { a.addEventListener('click', function () { who = a.dataset.who; $('#file').click(); }); });
$('#file').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return;
  var img = new Image();
  img.onload = function () {
    var c = document.createElement('canvas'); c.width = c.height = 200;
    var m = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 200, 200);
    avatars[who] = c.toDataURL('image/jpeg', 0.85); put('avatars', avatars); paintAv();
  };
  img.src = URL.createObjectURL(f); e.target.value = '';
});

// 搜歌
var queue = [], idx = -1;
function search() {
  var q = $('#q').value.trim(); if (!q) return;
  $('#q').blur();
  var box = $('#results'); box.innerHTML = '<div class="msg">在找……</div>';
  getJSON(API + '/search/get?s=' + encodeURIComponent(q) + '&type=1&limit=15').then(function (j) {
    var list = (j.result && j.result.songs) || [];
    if (!list.length) { box.innerHTML = '<div class="msg">没找到这首</div>'; return; }
    queue = list.map(function (s) { return { id: s.id, name: s.name, artist: (s.artists || []).map(function (a) { return a.name; }).join(' / '), dur: s.duration }; });
    box.innerHTML = '';
    queue.forEach(function (s, k) {
      var e = document.createElement('div'); e.className = 'song glass';
      e.innerHTML = '<div><b></b><small></small></div><small></small>';
      e.querySelector('b').textContent = s.name;
      e.querySelectorAll('small')[0].textContent = s.artist;
      e.querySelectorAll('small')[1].textContent = fmt(s.dur);
      e.addEventListener('click', function () { pick(k); });
      box.appendChild(e);
    });
  }).catch(function (err) { box.innerHTML = '<div class="msg">连不上网易云（' + err.message + '）</div>'; });
}
$('#go').addEventListener('click', search);
$('#q').addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });

// 一起听面板
function openL() { $('#listen').classList.add('on'); }
$('#back').addEventListener('click', function () { $('#listen').classList.remove('on'); });
$('#nav').addEventListener('click', function () { $('#listen').classList.toggle('on'); });
$('#mini').addEventListener('click', function () { if (idx >= 0) openL(); else $('#q').focus(); });
$('#miniPP').addEventListener('click', function (e) { e.stopPropagation(); if (idx < 0) { $('#q').focus(); return; } playing ? halt() : play(); });

// 歌词
var lines = [], playing = false, base = 0, startAt = 0, last = -2, timer = null;
function parseLrc(t) {
  var out = [];
  (t || '').split('\n').forEach(function (l) {
    var re = /\[(\d+):(\d+(?:\.\d+)?)\]/g, m, ts = [];
    while ((m = re.exec(l))) ts.push((+m[1] * 60 + +m[2]) * 1000);
    var x = l.replace(/\[[^\]]*\]/g, '').trim();
    if (!x) return;
    ts.forEach(function (t2) { out.push({ t: t2, x: x }); });
  });
  return out.sort(function (a, b) { return a.t - b.t; });
}
function setCover(u) { $('#lbl').style.backgroundImage = u ? 'url(' + u + ')' : ''; $('#miniDisc').style.backgroundImage = u ? 'url(' + u + ')' : ''; }
function pick(k) {
  idx = k; var s = queue[k]; halt(true); base = 0;
  $('#nt').textContent = s.name; $('#na').textContent = s.artist;
  $('#miniT').textContent = s.name; $('#miniA').textContent = s.artist;
  $('#dur').textContent = fmt(s.dur); $('#seek').max = s.dur;
  $('#lines').innerHTML = '<li>歌词加载中……</li>'; setCover('');
  openL();
  getJSON(API + '/song/detail?ids=[' + s.id + ']').then(function (j) {
    var p = j.songs && j.songs[0] && j.songs[0].album && j.songs[0].album.picUrl;
    if (p) setCover(p.replace('http:', 'https:') + '?param=300y300');
  }).catch(function () {});
  getJSON(API + '/song/lyric?id=' + s.id + '&lv=1&tv=1').then(function (j) {
    var main = parseLrc(j.lrc && j.lrc.lyric), tr = parseLrc(j.tlyric && j.tlyric.lyric);
    lines = main.map(function (l) { var t = tr.find(function (x) { return Math.abs(x.t - l.t) < 300; }); return { t: l.t, x: l.x, tr: t ? t.x : '' }; });
    draw();
  }).catch(function () { lines = []; draw(); });
}
function draw() {
  var ul = $('#lines'); ul.innerHTML = '';
  if (!lines.length) ul.innerHTML = '<li>这首没有歌词，安静地听吧</li>';
  lines.forEach(function (l) {
    var li = document.createElement('li'); li.textContent = l.x;
    if (l.tr) { var em = document.createElement('em'); em.textContent = l.tr; li.appendChild(em); }
    ul.appendChild(li);
  });
  last = -2; render(pos());
}
function pos() { return playing ? base + (Date.now() - startAt) : base; }
function render(p) {
  $('#cur').textContent = fmt(p); $('#seek').value = p;
  var k = -1;
  for (var n = 0; n < lines.length; n++) { if (lines[n].t <= p) k = n; else break; }
  if (k !== last) {
    last = k;
    var lis = $('#lines').children;
    for (var m = 0; m < lis.length; m++) lis[m].classList.toggle('cur', m === k);
    var li = lis[Math.max(k, 0)];
    if (li) $('#lines').style.transform = 'translateY(' + ($('#lyr').clientHeight / 2 - li.offsetTop - li.offsetHeight / 2) + 'px)';
  }
  var s = queue[idx];
  if (playing && s && p >= s.dur) { halt(); next(); }
}
function ui(on) {
  $('#pp').textContent = on ? PAUSE : PLAY; $('#miniPP').textContent = on ? PAUSE : PLAY;
  ['#disc', '#miniDisc', '#bars'].forEach(function (q) { $(q).classList.toggle('play', on); });
  $('#nav').classList.toggle('live', on);
}
function play() { if (idx < 0) return; playing = true; startAt = Date.now(); ui(true); clearInterval(timer); timer = setInterval(function () { render(pos()); }, 250); }
function halt() { if (playing) base = pos(); playing = false; clearInterval(timer); ui(false); }
function next() { if (queue.length) pick((idx + 1) % queue.length); }
$('#pp').addEventListener('click', function () { playing ? halt() : play(); });
$('#next').addEventListener('click', next);
$('#prev').addEventListener('click', function () { if (queue.length) pick((idx - 1 + queue.length) % queue.length); });
$('#seek').addEventListener('input', function (e) { base = +e.target.value; startAt = Date.now(); last = -2; render(base); });
