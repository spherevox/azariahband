const canvas = document.getElementById('staticCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
const receiveButton = document.getElementById('receiveButton');
const buttonText = document.getElementById('buttonText');
const prelude = document.getElementById('prelude');
const message = document.getElementById('message');
const frequency = document.getElementById('frequency');
const scanStatus = document.getElementById('scanStatus');
const meterFill = document.getElementById('meterFill');
const sequence = document.getElementById('sequence');
const song = document.getElementById('song');
const germanSignal = document.getElementById('germanSignal');

let audioContext;
let noiseSource;
let noiseGain;
let noiseFilter;
let masterGain;
let live = false;
let signalTimer;
let crackleTimer;
let dropoutTimer;
let dropoutRestoreTimer;
let timeTimer;
let songFadeFrame;
let germanFadeFrame;
let germanTimer;
let germanFadeTimer;
let buttonPulseTimer;
let scanStatusTimer;
let scanStatusFadeTimer;
let scanStatusIndex = 0;
let buttonBlinkVisible = true;
let wordmarkTimer;
let wordmarkHideTimer;
let frame = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let currentSignalState = 'lost';
let currentSongTarget = 0;
let signalGeneration = 0;
let germanHasPlayed = false;
let germanPlayCount = 0;
let transitionsSinceStart = 0;
let consecutiveMusicStates = 0;
let transitionsSinceGerman = 0;

const germanPhraseStarts = [0, 3.915, 8.15, 11.672, 15.424];

const phrases = [
  'SOURCE UNKNOWN',
  'CARRIER DRIFT',
  'AUDIO SOURCE TRACING INCOMPLETE',
  'TRANSMISSION INCOMPLETE',
  'SCANNING FREQUENCIES',
  'SIGNAL DECAY',
  'ARCHIVE FRAGMENT',
  'NO LOCK',
  'FREQUENCY UNSTABLE',
  'CARRIER LOST'
];

const scanMessages = [
  'SCANNING AVAILABLE FREQUENCIES',
  'SWEEPING LOWER BAND',
  'ANALYZING CARRIER PATTERN',
  'NO STABLE SOURCE DETECTED',
  'SEARCH WINDOW EXPANDING',
  'ADJACENT SIGNALS PRESENT'
];


function clearScanStatusTimers() {
  clearTimeout(scanStatusTimer);
  clearTimeout(scanStatusFadeTimer);
  scanStatus.classList.remove('is-changing');
}

function rotateScanStatus(immediate = false) {
  clearScanStatusTimers();
  if (!live) return;

  const showNext = () => {
    scanStatusIndex = (scanStatusIndex + 1) % scanMessages.length;
    scanStatus.textContent = scanMessages[scanStatusIndex];
    scanStatus.classList.remove('is-changing');
    scanStatusTimer = setTimeout(() => rotateScanStatus(false), randomBetween(2400, 4300));
  };

  if (immediate) {
    scanStatusIndex = 0;
    scanStatus.textContent = scanMessages[scanStatusIndex];
    scanStatus.classList.remove('is-changing');
    scanStatusTimer = setTimeout(() => rotateScanStatus(false), randomBetween(2200, 3600));
    return;
  }

  scanStatus.classList.add('is-changing');
  scanStatusFadeTimer = setTimeout(showNext, 280);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  const scale = Math.min(window.devicePixelRatio || 1, 1.5);
  canvasWidth = Math.max(180, Math.floor(window.innerWidth * scale * 0.28));
  canvasHeight = Math.max(120, Math.floor(window.innerHeight * scale * 0.28));
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
}

function drawStatic() {
  frame += 1;
  const image = ctx.createImageData(canvasWidth, canvasHeight);
  const data = image.data;
  const pulse = live ? 1 : 0.72;

  for (let i = 0; i < data.length; i += 4) {
    const random = Math.random();
    let value = random > 0.985 ? 255 : Math.floor(random * 178 * pulse);
    if (Math.random() > 0.997) value = 255;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = Math.floor((38 + Math.random() * 150) * pulse);
  }

  ctx.putImageData(image, 0, 0);

  if (frame % 7 === 0) {
    const y = Math.random() * canvasHeight;
    const height = 1 + Math.random() * 5;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.22})`;
    ctx.fillRect(0, y, canvasWidth, height);
  }

  requestAnimationFrame(drawStatic);
}

function createNoise(context) {
  const duration = 3;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;

  for (let i = 0; i < channel.length; i += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.18 + white * 0.82;
    const spike = Math.random() > 0.9986 ? (Math.random() * 2 - 1) * 2.8 : 0;
    channel[i] = previous * 0.55 + spike;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = buffer;
  source.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 1750;
  filter.Q.value = 0.58;
  gain.gain.value = 0.22;

  source.connect(filter).connect(gain).connect(masterGain);
  source.start();

  return { source, filter, gain };
}

function randomFrequency() {
  const value = 520 + Math.random() * 1180;
  frequency.textContent = `${value.toFixed(1).padStart(6, '0')} kHz`;
  meterFill.style.width = `${4 + Math.random() * 92}%`;
}

function fadeSongTo(target, durationSeconds) {
  cancelAnimationFrame(songFadeFrame);

  const startVolume = Number.isFinite(song.volume) ? song.volume : 0;
  const startTime = performance.now();
  const duration = Math.max(50, durationSeconds * 1000);

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    song.volume = Math.max(0, Math.min(1, startVolume + (target - startVolume) * eased));

    if (progress < 1 && live) {
      songFadeFrame = requestAnimationFrame(step);
    }
  }

  songFadeFrame = requestAnimationFrame(step);
}

function fadeGermanTo(target, durationSeconds) {
  cancelAnimationFrame(germanFadeFrame);

  const startVolume = Number.isFinite(germanSignal.volume) ? germanSignal.volume : 0;
  const startTime = performance.now();
  const duration = Math.max(50, durationSeconds * 1000);

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    germanSignal.volume = Math.max(0, Math.min(1, startVolume + (target - startVolume) * eased));

    if (progress < 1 && live) {
      germanFadeFrame = requestAnimationFrame(step);
    }
  }

  germanFadeFrame = requestAnimationFrame(step);
}

function clearGermanTimers() {
  clearTimeout(germanTimer);
  clearTimeout(germanFadeTimer);
  cancelAnimationFrame(germanFadeFrame);
}

function stopGermanTransmission() {
  clearGermanTimers();
  germanSignal.pause();
  germanSignal.volume = 0;
  germanSignal.playbackRate = 1;
}

async function startGermanTransmission(generation, stateDurationMs) {
  clearGermanTimers();
  if (!live || germanHasPlayed || generation !== signalGeneration || currentSignalState !== 'german') return;

  germanHasPlayed = true;
  germanPlayCount = 1;

  const phraseStart = germanPhraseStarts[Math.floor(Math.random() * germanPhraseStarts.length)];
  germanSignal.pause();
  germanSignal.currentTime = phraseStart + randomBetween(0.01, 0.10);
  germanSignal.playbackRate = randomBetween(0.95, 1.02);
  germanSignal.volume = 0;

  try {
    await germanSignal.play();
  } catch (error) {
    console.warn('German transmission could not start.', error);
    return;
  }

  fadeGermanTo(randomBetween(0.42, 0.60), randomBetween(0.18, 0.42));

  const phraseLength = Math.min(stateDurationMs - 350, randomBetween(4200, 5600));
  germanFadeTimer = setTimeout(() => {
    if (!live || generation !== signalGeneration || currentSignalState !== 'german') return;
    fadeGermanTo(0, 0.38);
    germanTimer = setTimeout(stopGermanTransmission, 430);
  }, Math.max(1200, phraseLength));
}

function scheduleButtonPulse() {
  clearTimeout(buttonPulseTimer);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    buttonText.style.opacity = '0.88';
    return;
  }

  buttonBlinkVisible = !buttonBlinkVisible;
  buttonText.style.opacity = buttonBlinkVisible ? '0.92' : '0.20';
  buttonText.style.textShadow = buttonBlinkVisible
    ? [
        '0 0 4px rgba(180, 22, 22, 0.68)',
        '0 0 11px rgba(120, 8, 8, 0.34)',
        '0 0 20px rgba(80, 0, 0, 0.14)'
      ].join(', ')
    : [
        '0 0 1px rgba(140, 18, 18, 0.26)',
        '0 0 5px rgba(90, 0, 0, 0.08)'
      ].join(', ');

  const nextDelay = buttonBlinkVisible
    ? randomBetween(420, 620)
    : randomBetween(280, 460);
  buttonPulseTimer = setTimeout(scheduleButtonPulse, nextDelay);
}

function clearWordmarkTimers() {
  clearTimeout(wordmarkTimer);
  clearTimeout(wordmarkHideTimer);
  document.body.classList.remove('wordmark-flash');
}

function scheduleWordmarkFlash(firstFlash = false) {
  clearTimeout(wordmarkTimer);
  if (!live) return;

  const delay = firstFlash ? randomBetween(2400, 4200) : randomBetween(13500, 16500);
  wordmarkTimer = setTimeout(() => {
    if (!live) return;

    document.body.classList.add('wordmark-flash');
    clearTimeout(wordmarkHideTimer);
    wordmarkHideTimer = setTimeout(() => {
      document.body.classList.remove('wordmark-flash');
      scheduleWordmarkFlash(false);
    }, 400);
  }, delay);
}

function scheduleCrackle() {
  clearTimeout(crackleTimer);
  if (!live || !audioContext || !noiseGain) return;

  const now = audioContext.currentTime;
  const current = Math.max(noiseGain.gain.value, 0.01);
  noiseGain.gain.cancelScheduledValues(now);
  noiseGain.gain.setValueAtTime(current, now);
  noiseGain.gain.linearRampToValueAtTime(randomBetween(0.30, 0.50), now + 0.025);
  noiseGain.gain.exponentialRampToValueAtTime(randomBetween(0.14, 0.24), now + randomBetween(0.16, 0.42));

  noiseFilter.frequency.setTargetAtTime(randomBetween(800, 3700), now, 0.08);
  crackleTimer = setTimeout(scheduleCrackle, randomBetween(350, 2900));
}

function clearDropoutTimers() {
  clearTimeout(dropoutTimer);
  clearTimeout(dropoutRestoreTimer);
}

async function ensureSongPlaying() {
  if (!song.paused) return true;
  try {
    await song.play();
    return true;
  } catch (error) {
    console.warn('Song could not resume.', error);
    return false;
  }
}

function pauseSongNow() {
  cancelAnimationFrame(songFadeFrame);
  song.volume = 0;
  song.pause();
}

function fadeAndPauseSong(durationSeconds = 0.18) {
  fadeSongTo(0, durationSeconds);
  window.setTimeout(() => {
    if (currentSignalState === 'lost' || currentSignalState === 'german' || !live) {
      pauseSongNow();
    }
  }, Math.max(80, durationSeconds * 1000 + 40));
}

function scheduleAudioDropout(generation) {
  clearDropoutTimers();
  if (!live || (currentSignalState !== 'fragment' && currentSignalState !== 'trace')) return;

  dropoutTimer = setTimeout(() => {
    if (!live || generation !== signalGeneration || (currentSignalState !== 'fragment' && currentSignalState !== 'trace')) return;

    const collapseTime = randomBetween(0.04, 0.22);
    const silenceLength = randomBetween(1.0, 3.4);
    fadeSongTo(0, collapseTime);

    window.setTimeout(() => {
      if (!live || generation !== signalGeneration) return;
      song.pause();
      song.volume = 0;
    }, collapseTime * 1000 + 30);

    dropoutRestoreTimer = setTimeout(async () => {
      if (!live || generation !== signalGeneration || (currentSignalState !== 'fragment' && currentSignalState !== 'trace')) return;
      const resumed = await ensureSongPlaying();
      if (!resumed) return;
      fadeSongTo(currentSongTarget * randomBetween(0.62, 1), randomBetween(0.18, 1.15));
      scheduleAudioDropout(generation);
    }, silenceLength * 1000);
  }, randomBetween(850, 2600));
}

function chooseNextState(state) {
  // Let one foreign transmission bleed through once, then never return to it.
  if (!germanHasPlayed && transitionsSinceStart >= 2) return 'german';

  // Never let the song ride continuously for too long. After two consecutive
  // music-bearing states, force a true static-only break.
  if ((state === 'fragment' || state === 'trace') && consecutiveMusicStates >= 2) {
    return 'lost';
  }

  const roll = Math.random();

  if (state === 'lost') {
    if (roll < 0.24) return 'lost';
    if (roll < 0.52) return 'trace';
    return 'fragment';
  }

  if (state === 'german') {
    return roll < 0.42 ? 'lost' : (roll < 0.70 ? 'trace' : 'fragment');
  }

  if (state === 'trace') {
    if (roll < 0.24) return 'lost';
    if (roll < 0.48) return 'trace';
    return 'fragment';
  }

  if (roll < 0.30) return 'lost';
  if (roll < 0.50) return 'trace';
  return 'fragment';
}

function setSignalState(state) {
  if (!live || !audioContext || !noiseGain) return;

  currentSignalState = state;
  transitionsSinceStart += 1;
  if (state === 'fragment' || state === 'trace') {
    consecutiveMusicStates += 1;
  } else {
    consecutiveMusicStates = 0;
  }
  signalGeneration += 1;
  const generation = signalGeneration;
  clearDropoutTimers();
  clearGermanTimers();

  if (state !== 'german') {
    stopGermanTransmission();
  }

  document.body.classList.toggle('signal-found', state === 'fragment');
  document.body.classList.toggle('signal-trace', state === 'trace');
  document.body.classList.toggle('signal-lost', state === 'lost' || state === 'german');
  document.body.classList.toggle('foreign-signal', state === 'german');

  const now = audioContext.currentTime;
  let noiseTarget;
  let transition;
  let nextDelay;

  if (state === 'fragment') {
    currentSongTarget = randomBetween(0.115, 0.19);
    noiseTarget = randomBetween(0.10, 0.18);
    transition = randomBetween(0.38, 2.4);
    nextDelay = randomBetween(4300, 11800);
    prelude.textContent = 'AUDIO CARRIER IDENTIFIED';
    message.textContent = Math.random() > 0.52 ? 'SIGNAL PARTIALLY RECOVERED' : 'AUDIO SOURCE TRACING INCOMPLETE';
    song.playbackRate = randomBetween(0.985, 1.012);
  } else if (state === 'trace') {
    currentSongTarget = randomBetween(0.045, 0.09);
    noiseTarget = randomBetween(0.15, 0.25);
    transition = randomBetween(0.18, 1.8);
    nextDelay = randomBetween(2400, 7200);
    prelude.textContent = 'CARRIER DRIFT DETECTED';
    message.textContent = Math.random() > 0.5 ? 'AUDIO TRACE' : 'TRANSMISSION INCOMPLETE';
    song.playbackRate = randomBetween(0.975, 1.018);
  } else if (state === 'german') {
    currentSongTarget = 0;
    noiseTarget = randomBetween(0.12, 0.19);
    transition = randomBetween(0.08, 0.34);
    nextDelay = randomBetween(5000, 6800);
    prelude.textContent = 'FOREIGN CARRIER DETECTED';
    message.textContent = Math.random() > 0.5 ? 'ADJACENT BAND INTERFERENCE' : 'VOICE SOURCE UNKNOWN';
    song.playbackRate = randomBetween(0.985, 1.008);
  } else {
    currentSongTarget = randomBetween(0, 0.004);
    noiseTarget = randomBetween(0.23, 0.37);
    transition = Math.random() > 0.50 ? randomBetween(0.06, 0.48) : randomBetween(0.7, 1.8);
    nextDelay = randomBetween(1800, 4800);
    prelude.textContent = 'UNIDENTIFIED TRANSMISSION DETECTED';
    message.textContent = phrases[Math.floor(Math.random() * phrases.length)];
    song.playbackRate = randomBetween(0.982, 1.008);
  }

  if (state === 'fragment' || state === 'trace') {
    ensureSongPlaying().then((started) => {
      if (started && live && generation === signalGeneration) {
        fadeSongTo(currentSongTarget, transition);
      }
    });
  } else {
    fadeAndPauseSong(transition);
  }

  noiseGain.gain.cancelScheduledValues(now);
  noiseGain.gain.setValueAtTime(Math.max(noiseGain.gain.value, 0.001), now);
  noiseGain.gain.exponentialRampToValueAtTime(noiseTarget, now + Math.max(0.08, transition * 0.72));

  randomFrequency();

  if (state === 'german') {
    startGermanTransmission(generation, nextDelay);
  }

  if (state === 'fragment' || state === 'trace') {
    scheduleAudioDropout(generation);
  }

  clearTimeout(signalTimer);
  signalTimer = setTimeout(() => setSignalState(chooseNextState(state)), nextDelay);
}

function updateSequence() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  sequence.textContent = `// ${h}:${m}:${s} //`;
}

async function buildNoiseGraph() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.86;
  masterGain.connect(audioContext.destination);

  const noise = createNoise(audioContext);
  noiseSource = noise.source;
  noiseFilter = noise.filter;
  noiseGain = noise.gain;
}

async function startTransmission() {
  germanHasPlayed = false;
  germanPlayCount = 0;
  transitionsSinceStart = 0;
  consecutiveMusicStates = 0;
  transitionsSinceGerman = 0;
  await buildNoiseGraph();
  await audioContext.resume();

  song.muted = false;
  song.volume = 0;
  song.playbackRate = 1;

  // Unlock later playback during this user gesture, then keep the source paused
  // until its signal state is active.
  await song.play();
  song.pause();
  song.volume = 0;

  germanSignal.muted = false;
  germanSignal.volume = 0;
  germanSignal.currentTime = 0;
  germanSignal.playbackRate = 1;
  await germanSignal.play();
  germanSignal.pause();
  germanSignal.currentTime = 0;

  live = true;
  document.body.classList.add('is-live', 'signal-lost');
  receiveButton.setAttribute('aria-label', 'End transmission');
  buttonText.textContent = 'END SIGNAL';
  buttonBlinkVisible = true;
  prelude.textContent = 'CARRIER ACQUIRED';
  message.textContent = 'SEARCHING WITHIN NOISE';
  randomFrequency();
  updateSequence();
  clearInterval(timeTimer);
  timeTimer = setInterval(updateSequence, 1000);
  scheduleCrackle();
  rotateScanStatus(true);

  // Establish the noise first, then let the song break through very quickly.
  setSignalState('lost');
  clearTimeout(signalTimer);
  signalTimer = setTimeout(() => setSignalState('fragment'), randomBetween(500, 950));
}

function stopTransmission() {
  live = false;
  signalGeneration += 1;
  clearTimeout(signalTimer);
  clearTimeout(crackleTimer);
  clearDropoutTimers();
  clearWordmarkTimers();
  clearScanStatusTimers();
  clearInterval(timeTimer);
  cancelAnimationFrame(songFadeFrame);
  song.pause();
  song.volume = 0;
  song.playbackRate = 1;
  stopGermanTransmission();

  if (audioContext && noiseGain) {
    const now = audioContext.currentTime;
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setTargetAtTime(0.0001, now, 0.08);
  }

  document.body.classList.remove('is-live', 'signal-found', 'signal-trace', 'signal-lost', 'foreign-signal');
  receiveButton.setAttribute('aria-label', 'Begin receiving transmission');
  buttonText.textContent = 'RECEIVE SIGNAL';
  buttonBlinkVisible = true;
  scheduleButtonPulse();
  prelude.textContent = 'UNIDENTIFIED TRANSMISSION DETECTED';
  message.textContent = 'SOURCE UNKNOWN';
  frequency.textContent = '0000.0 kHz';
  scanStatus.textContent = 'SCANNING AVAILABLE FREQUENCIES';
  meterFill.style.width = '0';
}

receiveButton.addEventListener('click', async () => {
  try {
    if (live) {
      stopTransmission();
    } else {
      await startTransmission();
    }
  } catch (error) {
    console.error(error);
    prelude.textContent = 'TRANSMISSION FAILURE';
    message.textContent = 'AUDIO FILE COULD NOT BE OPENED';
  }
});

song.addEventListener('error', () => {
  prelude.textContent = 'TRANSMISSION FAILURE';
  message.textContent = 'AUDIO FILE MISSING';
});

germanSignal.addEventListener('error', () => {
  console.warn('German transmission audio could not be loaded.');
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawStatic();
updateSequence();
scheduleButtonPulse();
