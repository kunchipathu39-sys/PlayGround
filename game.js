(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  let W = 1600, H = 900, dpr = 1, started = false, paused = false;
  let player = { x: 800, y: 0, facing: 1, step: 0 };
  let keys = new Set(), touch = 0, time = 0, found = new Set(), toastTimer, chordMark = -1;
  let audio = null, musicOn = false;
  const glimmers = [0.11, 0.25, 0.39, 0.63, 0.78, 0.91].map((p, i) => ({ p, y: [0, -21, 8, -15, 5, -12][i], phase: i * 1.77 }));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const scale = rect.height / 900;
    W = rect.width / scale; H = 900;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    player.y = H * .795;
    player.x = started ? clamp(player.x, W * .045, W * .955) : W * .5;
  }
  window.addEventListener('resize', resize); resize();

  function gradient(y1, y2, stops) {
    const g = ctx.createLinearGradient(0, y1, 0, y2);
    stops.forEach(([p, c]) => g.addColorStop(p, c)); return g;
  }
  function polygon(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry, fill, alpha = 1) {
    ctx.globalAlpha = alpha; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
  }
  function mountain(points, color, shade, snow = false) {
    polygon(points, color);
    if (shade) polygon([points[0], points[1], points[2], [points[2][0] * .55 + points[1][0] * .45, points[2][1] + 45], [points[0][0] * .56 + points[1][0] * .44, points[0][1] + 160]], shade);
    if (snow) {
      const p = points[1];
      polygon([[p[0] - 68, p[1] + 90], [p[0] - 24, p[1] + 14], [p[0] + 10, p[1] + 58], [p[0] + 34, p[1] + 36], [p[0] + 77, p[1] + 112], [p[0] + 34, p[1] + 91], [p[0] + 10, p[1] + 116], [p[0] - 14, p[1] + 94]], '#f0e9d8');
    }
  }
  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, 610);
    sky.addColorStop(0, '#648d94'); sky.addColorStop(.35, '#a9bdb0'); sky.addColorStop(.7, '#f1c99b'); sky.addColorStop(1, '#f5d6a5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const sx = W * .51, sy = 344, sunRise = Math.min(1, time * .018 + .24);
    const sunY = sy + (1 - sunRise) * 110;
    const halo = ctx.createRadialGradient(sx, sunY, 8, sx, sunY, W * .29);
    halo.addColorStop(0, 'rgba(255,235,184,.75)'); halo.addColorStop(.18, 'rgba(255,218,156,.25)'); halo.addColorStop(1, 'rgba(255,211,162,0)');
    ctx.fillStyle = halo; ctx.fillRect(sx - W * .29, sunY - W * .29, W * .58, W * .58);
    ellipse(sx, sunY, 48, 48, '#fff0bd', .93);
    // Fine, high clouds catch the first warm light.
    for (let i = 0; i < 7; i++) {
      const cx = (rnd(i + 4) * .9 + .03) * W, cy = 125 + rnd(i + 41) * 120;
      ctx.strokeStyle = `rgba(255,239,210,${.1 + rnd(i + 9) * .13})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 65, cy); ctx.bezierCurveTo(cx - 20, cy - 5, cx + 20, cy + 5, cx + 80, cy - 1); ctx.stroke();
    }
    const a = W;
    mountain([[-.05*a, 510], [.08*a, 345], [.14*a, 444], [.28*a, 296], [.42*a, 470], [.51*a, 310], [.63*a, 478], [.78*a, 300], [.9*a, 470], [1.05*a, 355], [1.05*a, 670], [-.05*a, 670]], '#829d99', '#708b89', true);
    mountain([[-.1*a, 542], [.06*a, 414], [.18*a, 513], [.31*a, 355], [.45*a, 530], [.59*a, 390], [.76*a, 535], [.9*a, 363], [1.07*a, 510], [1.1*a, 690], [-.1*a, 690]], '#6b8987', '#5c7c7d', true);
    // The cleft opens just behind the rising sun.
    const gap = ctx.createRadialGradient(W*.51, 416, 5, W*.51, 416, W*.37);
    gap.addColorStop(0, 'rgba(255,231,180,.55)'); gap.addColorStop(1, 'rgba(255,231,180,0)');
    ctx.fillStyle = gap; ctx.fillRect(W*.16, 275, W*.7, 330);
    mountain([[-.12*a, 626], [.02*a, 480], [.17*a, 580], [.27*a, 430], [.39*a, 612], [.54*a, 448], [.67*a, 605], [.81*a, 437], [.94*a, 590], [1.1*a, 469], [1.1*a, 760], [-.12*a, 760]], '#547878', '#466b6d');
  }
  function drawForestLine(y, count, color, size, seed) {
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * W + (rnd(i + seed) - .5) * 28;
      const h = size * (.65 + rnd(i + seed * 2) * .7), width = h * (.22 + rnd(i + seed * 3) * .08);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - width, y); ctx.lineTo(x + width, y); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 1.4, y - h * .16, 2.8, h * .16);
    }
  }
  function drawValley() {
    const cx = W * .51;
    polygon([[0, 518], [W*.12, 484], [W*.22, 511], [W*.35, 470], [W*.49, 523], [W*.61, 480], [W*.75, 520], [W*.88, 478], [W, 525], [W, 900], [0, 900]], gradient(490, 900, [[0, '#77978a'], [.5, '#567c70'], [1, '#294f4b'] ]));
    // Distant terraces draw the eye toward the waterfall.
    polygon([[0, 601], [W*.17, 542], [W*.3, 591], [W*.46, 524], [W*.55, 565], [W*.7, 531], [W*.84, 590], [W, 536], [W, 692], [0, 692]], '#718d79');
    polygon([[0, 618], [W*.18, 564], [W*.3, 614], [W*.44, 558], [W*.57, 606], [W*.73, 554], [W*.86, 618], [W, 569], [W, 725], [0, 725]], '#628572');
    drawForestLine(589, 48, '#355e56', 68, 11);
    drawForestLine(641, 41, '#426b5c', 84, 22);
    // Waterfall gorge, inset into the green cliff.
    polygon([[cx-W*.085, 487], [cx-W*.073, 566], [cx-W*.035, 624], [cx+W*.04, 624], [cx+W*.077, 562], [cx+W*.09, 489], [cx+W*.05, 511], [cx, 492]], '#395f59');
    const fall = ctx.createLinearGradient(cx, 488, cx, 736);
    fall.addColorStop(0, '#deeadf'); fall.addColorStop(.25, '#bad8d1'); fall.addColorStop(.7, '#a6d0ca'); fall.addColorStop(1, '#e8ead5');
    polygon([[cx-W*.031, 516], [cx+W*.032, 516], [cx+W*.021, 677], [cx+W*.069, 725], [cx-W*.059, 725], [cx-W*.019, 678]], fall);
    // Luminous ribbons in the falling water.
    for (let i = 0; i < 9; i++) {
      const x = cx + (i - 4) * W*.007, wiggle = Math.sin(time * 1.6 + i * 2) * 4;
      ctx.beginPath(); ctx.moveTo(x, 521); ctx.bezierCurveTo(x + wiggle, 584, x - wiggle, 643, x + wiggle * .4, 697);
      ctx.strokeStyle = i % 2 ? 'rgba(246,255,231,.45)' : 'rgba(107,177,177,.32)'; ctx.lineWidth = i % 2 ? 2 : 3; ctx.stroke();
    }
    // Spray catches the morning light.
    for (let i = 0; i < 22; i++) {
      const x = cx + Math.sin(time * .65 + i * 8) * (18 + rnd(i + 6) * 42);
      const y = 705 + rnd(i + 22) * 35;
      ellipse(x, y, 1.6 + rnd(i) * 2.1, 1.6 + rnd(i) * 2.1, '#e8f4dc', .35 + rnd(i + 8) * .35);
    }
    ellipse(cx, 731, W*.105, 13, '#d4e4cc', .7);
    drawForestLine(676, 56, '#315a4f', 60, 33);
    // Banks frame the water and soften into the foreground.
    polygon([[0, 652], [W*.13, 624], [W*.25, 647], [W*.4, 631], [W*.49, 661], [W*.62, 641], [W*.77, 668], [W*.9, 629], [W, 658], [W, 900], [0, 900]], gradient(630, 900, [[0, '#789474'], [.5, '#496f5e'], [1, '#244944']]));
  }
  function drawRiver() {
    const cx = W * .51;
    // River widens toward the viewer, with soft curving banks.
    const path = new Path2D();
    path.moveTo(cx - 23, 718); path.bezierCurveTo(cx - 87, 756, cx - 155, 787, cx - W*.4, 910);
    path.lineTo(cx + W*.4, 910); path.bezierCurveTo(cx + 155, 787, cx + 87, 756, cx + 23, 718); path.closePath();
    const water = ctx.createLinearGradient(cx, 715, cx, 900);
    water.addColorStop(0, '#a6cbc0'); water.addColorStop(.28, '#77b4ae'); water.addColorStop(.7, '#528d91'); water.addColorStop(1, '#376c77');
    ctx.fillStyle = water; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    for (let i = 0; i < 34; i++) {
      const y = 738 + ((i * 41 + time * (8 + (i % 3) * 3)) % 190);
      const spread = 38 + ((y - 730) / 180) * W*.31;
      const x = cx + Math.sin(i * 18.4 + time * .22) * spread * .68;
      const length = 8 + rnd(i + 5) * (y - 720) * .18;
      ctx.beginPath(); ctx.moveTo(x - length, y); ctx.quadraticCurveTo(x, y - 2, x + length, y + 1);
      ctx.strokeStyle = `rgba(232,246,219,${.12 + rnd(i + 8) * .23})`; ctx.lineWidth = 1 + (y - 730) * .008; ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const yy = 774 + i * 15, xx = cx + Math.sin(time * .4 + i) * (20 + i * 7);
      ellipse(xx, yy, 24 + i * 4, 2.3, '#d5e8d1', .08);
    }
    ctx.restore();
    // Soft grassy margins.
    polygon([[0, 709], [W*.2, 682], [W*.39, 716], [cx-28, 729], [cx-W*.12, 788], [cx-W*.43, 900], [0, 900]], gradient(680, 900, [[0, '#719071'], [1, '#294b43']]));
    polygon([[W, 707], [W*.82, 681], [W*.64, 719], [cx+30, 729], [cx+W*.12, 788], [cx+W*.43, 900], [W, 900]], gradient(680, 900, [[0, '#6c8c6f'], [1, '#294b43']]));
  }
  function drawFlowers() {
    for (let i = 0; i < 95; i++) {
      const x = rnd(i + 81) * W, y = 730 + rnd(i + 101) * 190;
      const riverHalf = 30 + ((y - 720) / 180) * W*.36;
      if (Math.abs(x - W*.51) < riverHalf + 12) continue;
      const s = 1.2 + rnd(i + 144) * 2.3;
      ctx.strokeStyle = 'rgba(211,224,174,.32)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x + Math.sin(time + i) * 1.5, y); ctx.stroke();
      ellipse(x, y, s, s, i % 5 === 0 ? '#f5dba8' : '#e5e5c4', .75);
    }
  }
  function drawGlimmers() {
    glimmers.forEach((g, i) => {
      if (found.has(i)) return;
      const x = g.p * W, y = 695 + g.y + Math.sin(time * 1.4 + g.phase) * 7;
      const pulse = 1 + Math.sin(time * 2 + g.phase) * .13;
      const halo = ctx.createRadialGradient(x, y, 1, x, y, 25 * pulse);
      halo.addColorStop(0, 'rgba(255,239,179,.8)'); halo.addColorStop(1, 'rgba(255,224,148,0)');
      ctx.fillStyle = halo; ctx.fillRect(x - 28, y - 28, 56, 56);
      ctx.save(); ctx.translate(x, y); ctx.rotate(time * .35 + g.phase);
      ctx.fillStyle = '#fff0bc'; ctx.beginPath(); ctx.moveTo(0, -7*pulse); ctx.quadraticCurveTo(3, -2, 7*pulse, 0); ctx.quadraticCurveTo(2, 3, 0, 7*pulse); ctx.quadraticCurveTo(-3, 2, -7*pulse, 0); ctx.quadraticCurveTo(-2, -3, 0, -7*pulse); ctx.fill(); ctx.restore();
    });
  }
  function drawTree(x, y, scale, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#4c664f'; ctx.fillRect(-2, -35, 4, 37);
    for (let i = 0; i < 4; i++) {
      const yy = -85 + i * 17, half = 17 - i * 1.5;
      polygon([[-half, yy + 25], [0, yy - 9], [half, yy + 25]], i % 2 ? color : '#385c50');
    }
    ctx.restore();
  }
  function drawPlayer() {
    const x = player.x, y = player.y + Math.sin(player.step * 2) * (started && !paused ? 1.5 : 0);
    // A soft contact shadow and a small traveler in a warm ochre cloak.
    ellipse(x, y + 7, 23, 6, '#183e39', .31);
    ctx.save(); ctx.translate(x, y); ctx.scale(player.facing * 1.22, 1.22);
    const walking = started && !paused && (keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('a') || keys.has('d') || touch);
    const swing = walking ? Math.sin(player.step * 1.5) * 5 : 0;
    // boots
    ctx.strokeStyle = '#473d37'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-8 + swing*.35, 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(7 - swing*.35, 5); ctx.stroke();
    // cape / body
    polygon([[-13, -38], [-9, -53], [7, -53], [14, -39], [12, -9], [5, -3], [-11, -7], [-15, -16]], '#bd7955');
    polygon([[-12, -38], [-8, -49], [3, -47], [7, -8], [-9, -7], [-15, -17]], '#d89a68');
    ctx.strokeStyle = '#f1c78d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -37); ctx.lineTo(10, -37); ctx.stroke();
    // head and hair
    ellipse(0, -61, 12, 13, '#dca578');
    ellipse(-1, -69, 13, 8, '#4b4c42'); ellipse(-10, -62, 4, 8, '#4b4c42');
    ellipse(4, -62, 1.25, 1.6, '#29433f');
    // pack peeks over the shoulders
    ctx.fillStyle = '#788a67'; ctx.beginPath(); ctx.roundRect(-14, -49, 7, 18, 3); ctx.fill();
    // swinging arm
    ctx.strokeStyle = '#dca578'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(9, -43); ctx.lineTo(13 + swing*.5, -27); ctx.stroke();
    ctx.restore();
  }
  function drawForegroundTrees() {
    drawTree(W*.035, 834, 1.42, '#294e46'); drawTree(W*.966, 839, 1.55, '#2b5047');
    drawTree(W*.13, 882, .75, '#345d50'); drawTree(W*.87, 875, .88, '#355e51');
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky(); drawValley(); drawRiver(); drawFlowers(); drawGlimmers();
    // Reeds along the banks give the water a little depth.
    for (let i = 0; i < 35; i++) {
      const side = i % 2 ? -1 : 1, y = 740 + rnd(i + 201) * 116;
      const spread = 40 + ((y - 730) / 180) * W*.34;
      const x = W*.51 + side * (spread + 5 + rnd(i + 251) * 25);
      ctx.strokeStyle = i % 3 ? '#597758' : '#9a9e70'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.quadraticCurveTo(x + side*4, y, x + side*3, y - 7 - rnd(i+6)*8); ctx.stroke();
    }
    drawForegroundTrees(); drawPlayer();
    // Floating dust / firefly motes in the sunbeam.
    for (let i = 0; i < 26; i++) {
      const x = (rnd(i + 400) * W + Math.sin(time*.12 + i) * 9) % W;
      const y = 370 + rnd(i + 430) * 340 + Math.sin(time*.4 + i*2) * 4;
      ellipse(x, y, 1 + rnd(i+4), 1 + rnd(i+4), '#fff2c4', .25 + .22 * Math.sin(time + i));
    }
  }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2300);
  }
  function update(dt) {
    time += dt;
    if (musicOn && audio) {
      const mark = Math.floor(time / 11);
      if (mark !== chordMark) { chordMark = mark; audio._shiftChord(); }
    }
    if (!started || paused) return;
    let direction = touch;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) direction -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) direction += 1;
    direction = clamp(direction, -1, 1);
    if (direction) {
      player.x = clamp(player.x + direction * 225 * dt, W*.045, W*.955);
      player.facing = direction < 0 ? -1 : 1; player.step += dt * 9;
    }
    glimmers.forEach((g, i) => {
      if (!found.has(i) && Math.abs(player.x - g.p * W) < Math.max(26, W*.026)) {
        found.add(i); $('count').textContent = found.size;
        if (found.size === 6) {
          $('quest-text').textContent = 'The whole valley is waking up';
          showToast('All six glimmers found · the morning is yours ✦');
          playChime(true);
        } else {
          $('quest-text').textContent = `${6 - found.size} glimmer${6-found.size === 1 ? '' : 's'} still waiting along the river`;
          showToast(['A little light to carry with you ✦', 'The river keeps its own kind of magic ✦', 'One more quiet sparkle found ✦'][found.size % 3]);
          playChime(false);
        }
      }
    });
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.04, (now - last) / 1000); last = now;
    update(dt); draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function togglePause(force) {
    if (!started) return;
    paused = typeof force === 'boolean' ? force : !paused;
    $('pause-screen').classList.toggle('visible', paused);
  }
  $('begin').addEventListener('click', () => {
    started = true; $('intro').classList.add('hidden'); $('quest').classList.add('visible'); $('controls-hint').classList.add('visible');
    if (!musicOn) toggleMusic();
    setTimeout(() => $('controls-hint').classList.remove('visible'), 6500);
  });
  $('resume').addEventListener('click', () => togglePause(false));
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight',' ','Space'].includes(e.key)) e.preventDefault();
    if (e.key === ' ' || e.key === 'Escape') { if (started) togglePause(); return; }
    keys.add(e.key);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));
  window.addEventListener('blur', () => keys.clear());
  const bindHold = (id, dir) => {
    const el = $(id);
    const down = (e) => { e.preventDefault(); touch = dir; if (el.setPointerCapture) el.setPointerCapture(e.pointerId); };
    const up = () => { if (touch === dir) touch = 0; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  };
  bindHold('left', -1); bindHold('right', 1);

  function initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
    const master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);
    const reverb = audio.createConvolver();
    const length = audio.sampleRate * 2.4, buffer = audio.createBuffer(2, length, audio.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buffer.getChannelData(c); for (let i=0;i<length;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/length, 2.3); }
    reverb.buffer = buffer; reverb.connect(master);
    const dry = audio.createGain(); dry.gain.value = .35; dry.connect(master);
    const wet = audio.createGain(); wet.gain.value = .65; wet.connect(reverb);
    const notes = [110, 164.81, 220, 261.63, 329.63];
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain(), filter = audio.createBiquadFilter();
      osc.type = i < 2 ? 'sine' : 'triangle'; osc.frequency.value = freq;
      filter.type = 'lowpass'; filter.frequency.value = 680;
      gain.gain.value = i === 0 ? .12 : .035;
      osc.connect(filter); filter.connect(gain); gain.connect(dry); gain.connect(wet); osc.start();
    });
    // A slow, evolving chord progression in a gentle D-major palette.
    const chordSets = [[0,2,4],[1,3,4],[0,2,3],[1,2,4]];
    let chord = 0;
    const shiftChord = () => {
      if (!audio || !musicOn) return;
      const freqs = [notes[0], ...notes.slice(1)];
      const set = chordSets[chord++ % chordSets.length];
      audio._voices.forEach((o, i) => { o.frequency.setTargetAtTime(freqs[set[i % set.length]] * (i > 3 ? 2 : 1), audio.currentTime, 2.4); });
    };
    audio._voices = [];
    notes.forEach((freq, i) => { const o=audio.createOscillator(); o.type=i<2?'sine':'triangle'; o.frequency.value=freq; audio._voices.push(o); });
    // Voices are connected softly; the first set of pad tones above supplies the constant river hush.
    audio._voices.forEach((o,i)=>{const g=audio.createGain();g.gain.value=i===0?.025:.014;o.connect(g);g.connect(wet);o.start();});
    audio._shiftChord = shiftChord;
    audio._master = master;
    audio._dry = dry;
  }
  function toggleMusic() {
    musicOn = !musicOn;
    if (musicOn) {
      if (!audio) initAudio();
      if (audio) { audio.resume(); audio._master.gain.setTargetAtTime(.42, audio.currentTime, .8); audio._shiftChord(); chordMark = Math.floor(time / 11); }
      $('sound-icon').textContent = '♫'; $('sound-toggle').classList.add('active'); $('sound-toggle').setAttribute('aria-label','Turn peaceful music off');
    } else {
      if (audio) audio._master.gain.setTargetAtTime(0, audio.currentTime, .5);
      $('sound-icon').textContent = '♪'; $('sound-toggle').classList.remove('active'); $('sound-toggle').setAttribute('aria-label','Turn peaceful music on');
    }
  }
  function playChime(finale) {
    if (!audio || !musicOn) return;
    const notes = finale ? [523.25, 659.25, 783.99] : [659.25, 783.99];
    notes.forEach((freq, i) => {
      const o=audio.createOscillator(), g=audio.createGain(); o.type='sine'; o.frequency.value=freq;
      const t=audio.currentTime+i*.14; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.09,t+.04); g.gain.exponentialRampToValueAtTime(.0001,t+1.4);
      o.connect(g); g.connect(audio._dry); o.start(t); o.stop(t+1.5);
    });
  }
  $('sound-toggle').addEventListener('click', toggleMusic);
})();
