// Ported from game-main/src/main.ts (a standalone Vite app that owned the
// whole document). Kept as the same imperative DOM-templating engine —
// rewriting 4 fairly intricate games as React state/JSX risked subtly
// changing feel/timing for no benefit. Structural changes from the original:
//   - Module-level mutable state is scoped inside `mountGameApp`, since
//     Next.js is an SPA and can remount this component without a hard page
//     reload (the vanilla app relied on a full reload to reset state).
//   - The visual layer (every template string's classes) matches this site's
//     own black/white design system (Navbar/AssessmentStepBar chrome, the
//     same card/button language as /game and the rest of the assessment
//     flow) instead of game-main's standalone mint-green mobile-app look.
import { BartGameEngine } from './game1-bart/engine';
import type { Game1Payload } from './game1-bart/types';
import { WcstGameEngine } from './game2-wcst/engine';
import type { Game2Payload, WagashiCard, WagashiShape } from './game2-wcst/types';
import { MeenFocusEngine } from './game3-flanker/engine';
import type { Game3Payload, FlankerTrial, TargetDirection } from './game3-flanker/types';
import { KongNeighborhoodEngine } from './game4-pgg/engine';
import type { Game4Payload, PggRoundLog } from './game4-pgg/types';
import { calculateRadarProfile } from './analytics/pipeline';
import type { CompleteAssessmentPayload, RadarChartOutput } from './analytics/pipeline';
import {
  unlockAudio, isMuted, toggleMuted,
  playPump, playBank, playBurst, playCorrect, playIncorrect, playClick, playComplete,
} from './shared/audio';
import { GAME_STAGES } from '../data';

// Asset URLs — plain /public paths (this is Next.js, not Vite: nothing draws
// these through next/image since they're used as raw <img src="..."> and
// <canvas> drawImage sources).
const cactusStage0Src = '/games/game1/cactus-stage-0.png';
const cactusStage1Src = '/games/game1/cactus-stage-1.png';
const cactusStage2Src = '/games/game1/cactus-stage-2.png';
const cactusStage3Src = '/games/game1/cactus-stage-3.png';
const cactusStage4Src = '/games/game1/cactus-stage-4.png';
const explosionSmallSrc = '/games/game1/explosion-small.png';
const explosionBigSrc = '/games/game1/explosion-big.webp';
const btnPumpSrc = '/games/game1/btn-pump.png';
const btnBankSrc = '/games/game1/btn-bank.png';
const backgroundSrc = '/games/game1/background.jpg';
const iconCoinSrc = '/games/game1/icon-coin.png';
const iconWaterSrc = '/games/game1/icon-water.png';

const wagashiFlowerSrc = '/games/game2/wagashi-flower.webp';
const wagashiLeafSrc = '/games/game2/wagashi-leaf.webp';
const wagashiRoundSrc = '/games/game2/wagashi-round.webp';
const trayGreenSrc = '/games/game2/tray_green.webp';
const trayBlueSrc = '/games/game2/tray_blue.webp';
const trayRedSrc = '/games/game2/tray_red.webp';
const wcstIconCorrectSrc = '/games/game2/icon-correct.webp';
const wcstIconIncorrectSrc = '/games/game2/icon-incorrect.webp';

const flankerArrowLeftSrc = '/games/game3/arrow-left.webp';
const flankerArrowRightSrc = '/games/game3/arrow-right.webp';
const flankerFixationSrc = '/games/game3/fixation-cross.webp';
const flankerBtnLeftSrc = '/games/game3/btn-left.webp';
const flankerBtnRightSrc = '/games/game3/btn-right.webp';
const flankerTimeoutSrc = '/games/game3/timeout.webp';

const pggAvatarMaleeSrc = '/games/game4/avatar-malee.webp';
const pggAvatarEkSrc = '/games/game4/avatar-ek.webp';
const pggAvatarBoySrc = '/games/game4/avatar-boy.webp';
const pggAvatarPlayerSrc = '/games/game4/avatar-player.webp';
const pggCoinSrc = '/games/game4/coin.webp';
const pggSliderPlusSrc = '/games/game4/slider-plus.webp';
const pggSliderMinusSrc = '/games/game4/slider-minus.webp';

// Fixed aiId->role mapping lives in the engine; this only decides the display
// name/portrait shown for each role, so it's safe to keep separate from the
// exported payload's underlying "AI 1"/"AI 2"/"AI 3" data.
const PGG_ROLE_INFO: Record<string, { displayName: string; avatar: string }> = {
  'Stable Cooperator': { displayName: 'ป้ามาลี', avatar: pggAvatarMaleeSrc },
  'Conditional Cooperator': { displayName: 'พี่เอก', avatar: pggAvatarEkSrc },
  'Persistent Free-rider': { displayName: 'บอย', avatar: pggAvatarBoySrc },
};

const wagashiShapeSrc: Record<WagashiShape, string> = {
  flower: wagashiFlowerSrc,
  leaf: wagashiLeafSrc,
  round: wagashiRoundSrc,
};
const wagashiTraySrc: Record<'green' | 'blue' | 'red', string> = {
  green: trayGreenSrc,
  blue: trayBlueSrc,
  red: trayRedSrc,
};

const flankerArrowSrc: Record<TargetDirection, string> = {
  left: flankerArrowLeftSrc,
  right: flankerArrowRightSrc,
};

const assetSources = {
  cactusStage0: cactusStage0Src,
  cactusStage1: cactusStage1Src,
  cactusStage2: cactusStage2Src,
  cactusStage3: cactusStage3Src,
  cactusStage4: cactusStage4Src,
  explosionSmall: explosionSmallSrc,
  explosionBig: explosionBigSrc,
  btnPumpImg: btnPumpSrc,
  btnBankImg: btnBankSrc,
  backgroundImg: backgroundSrc,
  iconCoin: iconCoinSrc,
  iconWater: iconWaterSrc,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const TOTAL_TRIALS = 20;
const CANVAS_W = 300; // fallback only; the live width is measured from the card
const CANVAS_H = 380;
const WCST_TOTAL = 40;
const FLANKER_TOTAL = 48;
const PGG_TOTAL_ROUNDS = 8;
// A 250-450ms cross before each trial anchors gaze at a fixed point, so the
// arrows' onset location never surprises the participant mid-scan.
const FLANKER_FIXATION_MS = 350;

// ---- Site design-system colors (mirrors GAME_STAGES / /game's palette —
// no CSS custom properties anymore, just plain constants next to the markup
// that uses them). ----
const COLOR_TEXT = '#0F0F0F';
const COLOR_TEXT_FAINT = '#8A8A8A';
const COLOR_BORDER = 'rgba(15,15,15,0.12)';
const COLOR_SURFACE_2 = '#F5F5F5';
const COLOR_GOLD = '#B97920';
const COLOR_DANGER = '#FF6E5C';
const COLOR_SAFE = '#3BF55C';
const FONT_BODY = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

// ---- Inline icon SVGs (lucide's gauge/shuffle/target/handshake path data —
// same 4 icons /game and the old mockup use for these games via GAME_STAGES'
// iconKey) — plain markup since this is vanilla innerHTML, not JSX. ----
const ICON_PATHS: Record<string, string> = {
  risk: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  flexibility: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
  focus: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  collaboration: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
};

function iconSvgHTML(iconKey: string, color: string, size = 20): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[iconKey]}</svg>`;
}

/** Header status row + 4-segment progress bar shared by every game's trial
 *  screen — same markup language as the old /play mockup and /game. */
function gameHeaderHTML(stageIndex: number, hudLabel: string, hudValue: string, hudValueId?: string): string {
  const game = GAME_STAGES[stageIndex];
  return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,15,15,0.08)] pb-4">
      <div>
        <div class="mb-1 inline-flex items-center gap-2 rounded-full border border-[rgba(15,15,15,0.08)] bg-white px-3 py-0.5 text-xs font-bold text-[#5C5C5C]">
          <span class="h-2 w-2 rounded-full" style="background:${game.color}"></span>
          Neuroscience Game
        </div>
        <h1 class="text-[clamp(20px,3.5vw,26px)] font-extrabold tracking-[-0.02em] text-[${COLOR_TEXT}]">${game.title}</h1>
      </div>
      <div class="flex items-center gap-2 rounded-xl border border-[rgba(15,15,15,0.1)] bg-white px-3.5 py-1.5 text-xs font-extrabold">
        <span class="text-[#8A8A8A]">${hudLabel}:</span>
        <span class="font-mono text-[#0F0F0F]"${hudValueId ? ` id="${hudValueId}"` : ''}>${hudValue}</span>
      </div>
    </div>
    <div class="mb-6 flex items-center gap-2">
      ${GAME_STAGES.map((_, idx) => `
        <div class="h-2 flex-1 rounded-full transition-all ${
          idx === stageIndex ? 'bg-[#0F0F0F]' : idx < stageIndex ? 'bg-[#3BF55C]' : 'bg-[rgba(15,15,15,0.12)]'
        }"></div>
      `).join('')}
    </div>
  `;
}

interface IntroOptions {
  persona: string[];
  rules: string[];
  sessionNote: string;
  beginBtnId: string;
}

/** Shared intro/rules-card layout for all 4 games — game-main always
 *  required reading real rules before a real instrument starts (unlike the
 *  old fake mockup, which had no such screen), so this keeps that but in the
 *  site's own card language instead of game-main's mint `.intro-inner`. */
function introScreenHTML(stageIndex: number, opts: IntroOptions): string {
  const game = GAME_STAGES[stageIndex];
  return `
    <div class="ktp-fade-up">
      <div class="mb-6 flex items-center gap-2">
        ${GAME_STAGES.map((_, idx) => `
          <div class="h-2 flex-1 rounded-full ${
            idx < stageIndex ? 'bg-[#3BF55C]' : idx === stageIndex ? 'bg-[#0F0F0F]' : 'bg-[rgba(15,15,15,0.12)]'
          }"></div>
        `).join('')}
      </div>
      <div class="flex flex-col items-center gap-3 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-8 text-center">
        <div class="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl" style="background:${game.color}1A">
          ${iconSvgHTML(game.iconKey, game.color, 28)}
        </div>
        <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A8A8A]">${game.subtitle}</div>
        <h2 class="text-xl font-extrabold tracking-[-0.02em] text-[#0F0F0F]">${game.title}</h2>
        <p class="max-w-[520px] text-xs leading-[1.7] text-[#5C5C5C]">${game.desc}</p>

        <div class="mt-2 flex w-full max-w-[440px] flex-col gap-2 rounded-xl border border-[rgba(15,15,15,0.08)] bg-[#FAFAFA] p-4 text-left">
          ${opts.persona.map((p) => `<p class="text-xs leading-[1.7] text-[#4A4A4A]">${p}</p>`).join('')}
        </div>

        <div class="mt-1 flex w-full max-w-[440px] flex-col gap-2.5 text-left">
          ${opts.rules.map((r, i) => `
            <div class="flex items-start gap-3 text-xs leading-[1.5] text-[#4A4A4A]">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[10px] font-bold text-[#0F0F0F]">${i + 1}</span>
              <span>${r}</span>
            </div>
          `).join('')}
        </div>

        <button id="${opts.beginBtnId}" type="button" class="mt-3 w-full max-w-[440px] cursor-pointer rounded-full bg-[#0F0F0F] py-4 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]">
          เริ่มเกม
        </button>
        <p class="text-[11px] text-[#8A8A8A]">${opts.sessionNote}</p>
      </div>
    </div>
  `;
}

function genSessionId(): string {
  return `sess_ktp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface MountGameAppOptions {
  /** Fired once, right when the combined session summary renders. */
  onComplete: (radar: RadarChartOutput) => void;
}

/**
 * Mounts the full 4-game session (BART -> WCST -> Flanker -> PGG -> summary)
 * into `rootEl` — the card `/play`'s page.tsx renders — replacing its
 * contents entirely per screen. Returns a cleanup function that must be
 * called on unmount (removes global listeners/timers and empties rootEl)
 * since, unlike game-main's original hard-reload lifecycle, Next won't
 * reload the document when the user navigates away from /play.
 */
export function mountGameApp(rootEl: HTMLElement, opts: MountGameAppOptions): () => void {
  const appSessionId = genSessionId();

  let assets: { [K in keyof typeof assetSources]: HTMLImageElement } | null = null;
  const assetsReady: Promise<void> = (async () => {
    const keys = Object.keys(assetSources) as (keyof typeof assetSources)[];
    const loaded = await Promise.all(keys.map((k) => loadImage(assetSources[k])));
    assets = Object.fromEntries(keys.map((k, i) => [k, loaded[i]])) as typeof assets extends infer T
      ? NonNullable<T>
      : never;
  })();

  // NOTE: the UI deliberately does not know or show the burst ceiling. Exposing
  // it (as a "max 32" label or a bar filling toward it) hands players the optimal
  // stopping point — for a uniform 1..32 threshold that is exactly 16 pumps, i.e.
  // a half-full bar — which would make adjustedAveragePumps measure whether they
  // spotted that cue rather than their actual risk appetite. The cactus art
  // (growing, then sweating at the top stage) carries the risk feedback instead,
  // matching how the original BART leaves the ceiling to be learned by experience.
  let canvasW = CANVAS_W;

  // ---- Runtime state — Game 1 ----
  let engine: BartGameEngine;
  let currentPumps = 0;
  let isBusy = false;
  let savedPayload: Game1Payload | null = null;
  let canvasCtx: CanvasRenderingContext2D | null = null;

  // ---- Runtime state — Game 2 ----
  let wcstEngine: WcstGameEngine;
  let wcstBusy = false;
  let wcstCorrectCount = 0;
  let savedGame2Payload: Game2Payload | null = null;

  // ---- Runtime state — Game 3 ----
  let flankerEngine: MeenFocusEngine;
  let flankerBusy = false;
  let flankerTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let savedGame3Payload: Game3Payload | null = null;

  // ---- Runtime state — Game 4 ----
  let pggEngine: KongNeighborhoodEngine;
  let pggBusy = false;
  let pggCountdownInterval: ReturnType<typeof setInterval> | null = null;
  let pggCountdownTimeout: ReturnType<typeof setTimeout> | null = null;
  let savedGame4Payload: Game4Payload | null = null;
  let pggLastCumulative = 0;

  let destroyed = false;

  // ---- Helpers ----
  function qs<T extends HTMLElement>(sel: string): T | null {
    return rootEl.querySelector<T>(sel);
  }
  function qsa<T extends HTMLElement>(sel: string): NodeListOf<T> {
    return rootEl.querySelectorAll<T>(sel);
  }

  function allGamesComplete(): boolean {
    return !!(savedPayload && savedGame2Payload && savedGame3Payload && savedGame4Payload);
  }

  // ---- Audio ----

  // Browsers block audio until a real user gesture, so the first click anywhere
  // unlocks the context. Kept as a capture-phase listener so it runs before the
  // handler that may want to play a sound on that same click.
  const onPointerDown = () => unlockAudio();
  document.addEventListener('pointerdown', onPointerDown, { capture: true });

  function renderMuteButton(): void {
    let btn = qs<HTMLButtonElement>('#mute-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'mute-btn';
      btn.className = 'absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(15,15,15,0.1)] bg-white text-sm shadow-sm transition-transform active:scale-90';
      rootEl.appendChild(btn);
      btn.addEventListener('click', () => {
        toggleMuted();
        syncMuteButton();
      });
    }
    syncMuteButton();
  }

  function syncMuteButton(): void {
    const btn = qs<HTMLButtonElement>('#mute-btn');
    if (!btn) return;
    const off = isMuted();
    btn.textContent = off ? '🔇' : '🔊';
    btn.setAttribute('aria-label', off ? 'Unmute sound' : 'Mute sound');
    btn.setAttribute('aria-pressed', String(off));
    btn.classList.toggle('opacity-60', off);
  }

  /** Everything except the mute button gets replaced per screen. */
  function setScreen(html: string) {
    const mute = qs<HTMLButtonElement>('#mute-btn');
    rootEl.innerHTML = html;
    if (mute) rootEl.appendChild(mute);
  }

  // ============================================================
  // GAME 1 — INTRO
  // ============================================================
  function renderGame1Intro() {
    setScreen(introScreenHTML(0, {
      persona: [
        "Jane traded her corporate spreadsheets for cactus soil. Now she runs a small plant shop, making gut-feel decisions every day: water more or hold back?",
        "How far do you push before you pull back?",
      ],
      rules: [
        'ปั๊มเพื่อให้ต้นกระบองเพชรโตขึ้นและได้คะแนนเพิ่ม',
        'กด Bank เมื่อไหร่ก็ได้เพื่อเก็บคะแนนที่สะสมไว้',
        'ปั๊มมากเกินไปต้นจะระเบิด และคะแนนที่ยังไม่ได้ Bank จะหายไป',
      ],
      sessionNote: '20 ต้น ไม่จำกัดเวลา',
      beginBtnId: 'begin-btn',
    }));
    qs<HTMLButtonElement>('#begin-btn')!.addEventListener('click', startGame);
  }

  // ============================================================
  // TRIAL SCREEN
  // ============================================================
  async function startGame() {
    engine = new BartGameEngine(appSessionId);
    engine.initializeGame();
    currentPumps = 0;
    isBusy = false;

    await assetsReady;
    if (destroyed) return;
    renderTrialScreen();
  }

  function renderTrialScreen() {
    setScreen(`
      ${gameHeaderHTML(0, 'คะแนนรวม', `${engine.getTotalPoints()}`, 'header-total-score')}

      <div class="relative flex flex-col items-center justify-center rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6 text-center">
        <div class="mb-3 flex w-full items-center justify-between text-xs font-bold text-[#5C5C5C]">
          <span>Cactus <span id="trial-num">1</span> / ${TOTAL_TRIALS}</span>
          <span class="flex items-center gap-1">
            <img src="${assets!.iconCoin.src}" class="h-4 w-4" alt="" />
            <span id="total-score">0</span>
          </span>
        </div>

        <div class="relative w-full overflow-hidden rounded-xl" id="canvas-wrap">
          <canvas id="cactus-canvas" class="block w-full"></canvas>
          <div id="canvas-overlay" class="pointer-events-none absolute inset-0 hidden items-center justify-center bg-[rgba(185,121,32,0.15)] font-extrabold text-[${COLOR_GOLD}]" aria-live="assertive" aria-atomic="true"></div>
        </div>

        <div class="mt-3 flex items-center gap-2 text-sm text-[#5C5C5C]">
          <img src="${assets!.iconWater.src}" class="h-4 w-4" alt="Pumps" />
          <span class="text-lg font-extrabold text-[#0F0F0F]" id="pump-count">0</span>
          <span class="text-[#8A8A8A]">·</span>
          <img src="${assets!.iconCoin.src}" class="h-4 w-4" alt="Coins" />
          <span class="font-bold text-[${COLOR_GOLD}]" id="unbanked-pts">0</span>
        </div>

        <div class="mt-4 flex w-full justify-center gap-4">
          <button id="pump-btn" type="button" class="w-24 cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <img src="${assets!.btnPumpImg.src}" alt="Pump" />
          </button>
          <button id="bank-btn" type="button" disabled class="w-24 cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <img src="${assets!.btnBankImg.src}" alt="Bank" />
          </button>
        </div>
      </div>
    `);

    const canvas = qs<HTMLCanvasElement>('#cactus-canvas')!;
    const wrap = qs<HTMLElement>('#canvas-wrap')!;
    // Fill the card's full width so the background art reaches both edges.
    canvasW = Math.round(wrap.clientWidth) || CANVAS_W;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${CANVAS_H}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    canvasCtx = ctx;

    drawCactus(ctx, 0, 'normal');
    updateHUD();

    qs<HTMLButtonElement>('#pump-btn')!.addEventListener('click', handlePump);
    qs<HTMLButtonElement>('#bank-btn')!.addEventListener('click', handleBank);
  }

  function handlePump() {
    if (isBusy) return;
    isBusy = true;

    const result = engine.pump();
    currentPumps = result.currentPumps;

    if (result.isExploded) {
      drawCactus(canvasCtx!, currentPumps, 'exploded');
      updateHUD();
      // The burst art carries the moment on its own — no text overlay or tint.
      playBurst();
      shakeCanvas();

      setTimeout(() => {
        if (destroyed) return;
        removeShake();
        currentPumps = 0;

        if (engine.isGameOver()) {
          renderGameOver();
        } else {
          drawCactus(canvasCtx!, 0, 'normal');
          updateHUD();
          setButtonsEnabled(true, false);
          isBusy = false;
        }
      }, 1500);
    } else {
      drawCactus(canvasCtx!, currentPumps, 'normal');
      updateHUD();
      // Pitch climbs with the plant so later pumps sound more strained. Scaled
      // against the stage bands, not the hidden ceiling, so it leaks nothing.
      playPump(Math.min(1, (getCactusStage(currentPumps) - 1) / 3));
      setButtonsEnabled(true, true);
      isBusy = false;
    }
  }

  function handleBank() {
    if (isBusy || currentPumps === 0) return;
    isBusy = true;

    const result = engine.bank();
    playBank();
    showOverlay(`✓ Banked ${result.bankedPoints} pts`);

    setTimeout(() => {
      if (destroyed) return;
      hideOverlay();
      currentPumps = 0;

      if (result.isGameOver) {
        renderGameOver();
      } else {
        drawCactus(canvasCtx!, 0, 'normal');
        updateHUD();
        setButtonsEnabled(true, false);
        isBusy = false;
      }
    }, 1000);
  }

  function updateHUD() {
    const trialIndex = engine.getCurrentTrialIndex();
    const totalPoints = engine.getTotalPoints();

    const trialEl = qs<HTMLElement>('#trial-num');
    if (trialEl) trialEl.textContent = String(trialIndex);

    const scoreEl = qs<HTMLElement>('#total-score');
    if (scoreEl) scoreEl.textContent = String(totalPoints);
    const headerScoreEl = qs<HTMLElement>('#header-total-score');
    if (headerScoreEl) headerScoreEl.textContent = String(totalPoints);

    const pumpEl = qs<HTMLElement>('#pump-count');
    if (pumpEl) pumpEl.textContent = String(currentPumps);

    const unbankedEl = qs<HTMLElement>('#unbanked-pts');
    if (unbankedEl) unbankedEl.textContent = String(currentPumps);
  }

  function setButtonsEnabled(pump: boolean, bank: boolean) {
    const pumpBtn = qs<HTMLButtonElement>('#pump-btn');
    const bankBtn = qs<HTMLButtonElement>('#bank-btn');
    if (pumpBtn) pumpBtn.disabled = !pump;
    if (bankBtn) bankBtn.disabled = !bank;
  }

  function showOverlay(message: string) {
    const el = qs<HTMLElement>('#canvas-overlay');
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
      el.textContent = message;
    }
  }

  function hideOverlay() {
    const el = qs<HTMLElement>('#canvas-overlay');
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
      el.textContent = '';
    }
  }

  function shakeCanvas() {
    qs<HTMLElement>('#canvas-wrap')?.classList.add('ktp-shake');
  }

  function removeShake() {
    qs<HTMLElement>('#canvas-wrap')?.classList.remove('ktp-shake');
  }

  // ============================================================
  // GAME OVER SCREEN
  // ============================================================
  function renderGameOver() {
    playComplete();
    savedPayload = engine.getPayload();
    renderGame2Intro();
  }

  // ============================================================
  // CANVAS — CACTUS RENDERER (image-based)
  // ============================================================

  // pumps 0 -> empty pot; 1-8/9-16/17-24/25-32 -> growth stages 1-4
  function getCactusStage(pumps: number): 0 | 1 | 2 | 3 | 4 {
    if (pumps <= 0) return 0;
    if (pumps <= 8) return 1;
    if (pumps <= 16) return 2;
    if (pumps <= 24) return 3;
    return 4;
  }

  interface ImageMetrics {
    // Bounding box of non-transparent pixels, in source-image pixels.
    x: number; y: number; w: number; h: number;
    // Width and centre-x of the widest row in the bottom band of that content —
    // for the plant art this is the pot, which is what should stay a consistent
    // size across stages (the cactus above it varies a lot).
    baseW: number;
    baseCx: number;
  }

  const imageMetricsCache = new Map<HTMLImageElement, ImageMetrics>();

  // Art files carry wildly different amounts of transparent padding (the empty
  // pot has 21% dead space below it, the cactus stages only 4%), so anchoring by
  // raw image edges makes some stages float and renders them at inconsistent
  // scales. Measure the real content instead.
  function getImageMetrics(img: HTMLImageElement): ImageMetrics {
    const cached = imageMetricsCache.get(img);
    if (cached) return cached;

    let metrics: ImageMetrics = {
      x: 0, y: 0, w: img.width, h: img.height,
      baseW: img.width, baseCx: img.width / 2,
    };

    try {
      const off = document.createElement('canvas');
      off.width = img.width;
      off.height = img.height;
      const octx = off.getContext('2d', { willReadFrequently: true })!;
      octx.drawImage(img, 0, 0);
      const data = octx.getImageData(0, 0, img.width, img.height).data;
      const alphaAt = (x: number, y: number) => data[(y * img.width + x) * 4 + 3];

      let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (alphaAt(x, y) > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX >= minX && maxY >= minY) {
        const bandTop = Math.max(minY, maxY - Math.round(img.height * 0.12));
        let baseW = 0;
        let baseCx = (minX + maxX) / 2;
        for (let y = bandTop; y <= maxY; y++) {
          let rowMin = img.width, rowMax = -1;
          for (let x = 0; x < img.width; x++) {
            if (alphaAt(x, y) > 10) {
              if (x < rowMin) rowMin = x;
              if (x > rowMax) rowMax = x;
            }
          }
          if (rowMax >= rowMin && rowMax - rowMin + 1 > baseW) {
            baseW = rowMax - rowMin + 1;
            baseCx = (rowMin + rowMax) / 2;
          }
        }
        metrics = {
          x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1,
          baseW: baseW || maxX - minX + 1,
          baseCx,
        };
      }
    } catch {
      // getImageData can throw on a tainted canvas; fall back to raw image bounds.
    }

    imageMetricsCache.set(img, metrics);
    return metrics;
  }

  // Draws the plant so its pot is `potWidth` wide, horizontally centred on
  // `centerX`, with the visible bottom of the art resting exactly on `groundY`.
  function drawPlant(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    centerX: number,
    groundY: number,
    potWidth: number,
  ) {
    const m = getImageMetrics(img);
    const scale = potWidth / m.baseW;
    ctx.drawImage(
      img,
      centerX - m.baseCx * scale,
      groundY - (m.y + m.h) * scale,
      img.width * scale,
      img.height * scale,
    );
  }

  // Draws a radial burst centred on a point, sized by its visible content.
  function drawBurst(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    centerX: number,
    centerY: number,
    width: number,
  ) {
    const m = getImageMetrics(img);
    const scale = width / m.w;
    ctx.drawImage(
      img,
      centerX - (m.x + m.w / 2) * scale,
      centerY - (m.y + m.h / 2) * scale,
      img.width * scale,
      img.height * scale,
    );
  }

  // Scale-to-cover (like CSS `background-size: cover`): fills the canvas
  // completely, center-cropping whichever axis overflows, so the art always
  // reaches every edge without distortion at any canvas size.
  function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
  ) {
    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  }

  function drawCactus(
    ctx: CanvasRenderingContext2D,
    pumps: number,
    state: 'normal' | 'exploded',
  ) {
    if (!assets) return;
    const W = canvasW;
    const H = CANVAS_H;
    ctx.clearRect(0, 0, W, H);
    drawImageCover(ctx, assets.backgroundImg, W, H);

    const cx = W / 2;
    // The tabletop surface line in the background art.
    const groundY = H * 0.815;
    const stage = getCactusStage(pumps);

    if (state === 'exploded') {
      const explosionImg = stage <= 2 ? assets.explosionSmall : assets.explosionBig;
      const burstW = stage <= 2 ? 190 : 250;
      // Centred just above the tabletop, where the plant was.
      drawBurst(ctx, explosionImg, cx, groundY - burstW * 0.28, burstW);
      return;
    }

    const stageImages = [
      assets.cactusStage0,
      assets.cactusStage1,
      assets.cactusStage2,
      assets.cactusStage3,
      assets.cactusStage4,
    ];
    // The empty pot is drawn with a much wider rim relative to its base than the
    // cactus-sheet pots, so it needs a smaller base target to read the same size.
    const potWidths = [70, 84, 84, 84, 84];
    drawPlant(ctx, stageImages[stage], cx, groundY, potWidths[stage]);
  }


  // ============================================================
  // GAME 2 — WCST (Poom's Wagashi Sorting)
  // ============================================================

  function wagashiCardHTML(card: WagashiCard, widthPx: number, opts: { index?: number; interactive?: boolean } = {}): string {
    const shapeSrc = wagashiShapeSrc[card.shape];
    const symbols = Array.from({ length: card.count }, () => `<img class="inline-block w-[26%] drop-shadow" src="${shapeSrc}" alt="" />`).join('');
    const indexPin = opts.index !== undefined
      ? `<span class="absolute left-1.5 top-1 text-[10px] font-bold text-[#8A8A8A]">${opts.index + 1}</span>`
      : '';
    const traySrc = wagashiTraySrc[card.color];
    const interactiveCls = opts.interactive
      ? 'cursor-pointer transition-transform hover:-translate-y-1 active:scale-95'
      : '';
    return `
      <div
        class="wagashi-card relative flex items-center justify-center overflow-hidden rounded-xl shadow-sm ${interactiveCls}"
        style="width:${widthPx}px;aspect-ratio:345/194;background-image:url('${traySrc}');background-size:100% 100%;background-position:center;background-repeat:no-repeat"
        role="button" tabindex="0" aria-label="Plate ${opts.index !== undefined ? opts.index + 1 : ''}"
      >
        ${indexPin}
        <div class="flex w-[58%] items-center justify-center gap-0.5">${symbols}</div>
      </div>
    `;
  }

  // ---- Game 2 intro screen ----
  function renderGame2Intro() {
    const eng = new WcstGameEngine('_preview');
    const plates = eng.targetPlates;
    const platesHTML = plates.map((p, i) => wagashiCardHTML(p, 90, { index: i })).join('');

    setScreen(`
      ${introScreenHTML(1, {
        persona: [
          "ภูมิ (Poom) left his office job to become a matcha barista. Every day he arranges wagashi sweets on paper trays, but the customer's sorting rule changes without warning.",
          'Can you adapt when the rules shift under you?',
        ],
        rules: [
          'การ์ดวากาชิจะปรากฏขึ้น จัดวางลงถาดอ้างอิง 1 ใน 3 ถาด',
          'คุณจะได้รับผลเฉลยว่า "ถูก" หรือ "ผิด" แต่จะไม่บอกเหตุผล',
          'หลังตอบถูกติดต่อกัน 6 ครั้ง กติกาการจัดเรียงจะเปลี่ยนโดยไม่แจ้งล่วงหน้า',
        ],
        sessionNote: '40 การ์ด ไม่จำกัดเวลา',
        beginBtnId: 'begin-wcst-btn',
      })}
      <div class="mt-4 flex justify-center gap-2.5">${platesHTML}</div>
    `);
    qs<HTMLButtonElement>('#begin-wcst-btn')!.addEventListener('click', startGame2);
  }

  // ---- Start game 2 ----
  function startGame2() {
    wcstEngine = new WcstGameEngine(appSessionId);
    const firstCard = wcstEngine.initializeGame();
    wcstBusy = false;
    wcstCorrectCount = 0;
    renderGame2Trial(firstCard);
  }

  // ---- Game 2 trial screen ----
  function renderGame2Trial(card: WagashiCard) {
    const plates = wcstEngine.targetPlates;
    const trialIdx = wcstEngine.getCurrentTrialIndex();

    const platesHTML = plates
      .map((p, i) => wagashiCardHTML(p, 118, { index: i, interactive: true }))
      .join('');

    setScreen(`
      ${gameHeaderHTML(1, 'ตอบถูก', `${wcstCorrectCount}`, 'wcst-correct')}

      <div class="relative flex flex-col items-center gap-6 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6 text-center">
        <div class="text-xs font-bold text-[#5C5C5C]">การ์ด <span id="wcst-trial-num">${trialIdx}</span> / ${WCST_TOTAL}</div>

        <div class="flex justify-center gap-3" id="target-row">${platesHTML}</div>

        <div class="flex flex-col items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A8A]">จัดเรียงวากาชิชิ้นนี้</span>
          <div id="presented-card">${wagashiCardHTML(card, 168, {})}</div>
        </div>

        <div id="wcst-feedback" class="pointer-events-none fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    `);

    // Attach click handlers to target plates
    qsa<HTMLElement>('#target-row .wagashi-card').forEach((el, i) => {
      el.addEventListener('click', () => handleGame2Choice(i));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleGame2Choice(i); });
    });
  }

  function handleGame2Choice(targetIndex: number) {
    if (wcstBusy) return;
    wcstBusy = true;
    setGame2PlatesDisabled(true);

    const result = wcstEngine.submitChoice(targetIndex);
    if (result.isCorrect) wcstCorrectCount++;
    const correctEl = qs<HTMLElement>('#wcst-correct');
    if (correctEl) correctEl.textContent = String(wcstCorrectCount);

    // Show feedback
    if (result.isCorrect) playCorrect(); else playIncorrect();
    const fb = qs<HTMLElement>('#wcst-feedback');
    if (fb) {
      const icon = result.isCorrect ? wcstIconCorrectSrc : wcstIconIncorrectSrc;
      const label = result.isCorrect ? 'Correct' : 'Incorrect';
      fb.innerHTML = `<img class="h-20 w-20 drop-shadow-lg" src="${icon}" alt="${label}">`;
    }

    setTimeout(() => {
      if (destroyed) return;
      if (result.isGameOver) {
        renderGame2GameOver();
      } else {
        // Update presented card and trial counter
        const presentedEl = qs<HTMLElement>('#presented-card');
        if (presentedEl && result.nextCard) {
          presentedEl.innerHTML = wagashiCardHTML(result.nextCard, 168, {});
        }
        const trialEl = qs<HTMLElement>('#wcst-trial-num');
        if (trialEl) trialEl.textContent = String(wcstEngine.getCurrentTrialIndex());
        const fbEl = qs<HTMLElement>('#wcst-feedback');
        if (fbEl) fbEl.innerHTML = '';
        setGame2PlatesDisabled(false);
        wcstBusy = false;
      }
    }, 700);
  }

  function setGame2PlatesDisabled(disabled: boolean) {
    qsa<HTMLElement>('#target-row .wagashi-card').forEach((el) => {
      el.setAttribute('aria-disabled', String(disabled));
      el.style.pointerEvents = disabled ? 'none' : '';
      el.style.opacity = disabled ? '0.55' : '';
    });
  }

  // ---- Game 2 game-over screen ----
  function renderGame2GameOver() {
    playComplete();
    savedGame2Payload = wcstEngine.getPayload();
    wcstCorrectCount = 0;
    renderGame3Intro();
  }

  // ============================================================
  // GAME 3 — MEEN'S FOCUS MODE (Flanker Task)
  // ============================================================

  function flankerArrowImgHTML(direction: TargetDirection, size = 34): string {
    return `<img class="drop-shadow" style="width:${size}px" src="${flankerArrowSrc[direction]}" alt="${direction === 'left' ? '←' : '→'}">`;
  }

  function flankerCardRowHTML(trial: FlankerTrial): string {
    const center = trial.targetDirection;
    const flanker: TargetDirection = trial.condition === 'congruent' ? center : (center === 'left' ? 'right' : 'left');
    const cards = [flanker, flanker, center, flanker, flanker];
    return cards
      .map((dir, i) => {
        const isCenter = i === 2;
        const sizeCls = isCenter ? 'flex h-[88px] w-[76px] items-center justify-center' : 'flex h-[66px] w-14 items-center justify-center opacity-55';
        const label = isCenter ? 'Target' : 'Notif';
        return `<div class="${sizeCls}" aria-label="${label}">${flankerArrowImgHTML(dir, isCenter ? 44 : 34)}</div>`;
      })
      .join('');
  }

  /** Fixation cross shown briefly before each trial's arrows, to anchor gaze at a
   *  consistent point so the stimulus's onset location is never a surprise. */
  function flankerFixationHTML(): string {
    return `<div class="flex min-h-[88px] items-center justify-center"><img class="w-10 drop-shadow" src="${flankerFixationSrc}" alt="Get ready"></div>`;
  }

  // ---- Game 3 intro screen ----
  function renderGame3Intro() {
    setScreen(introScreenHTML(2, {
      persona: [
        'มีน (Meen) is studying for her university entrance exam. Her phone never stops buzzing, and every notification pulls her attention away from the lesson summary she needs to read.',
        'Can you focus on what matters and ignore the noise?',
      ],
      rules: [
        'จะมีการ์ด 5 ใบปรากฏขึ้น ให้โฟกัสที่ <strong>การ์ดตรงกลาง</strong>',
        'กดปุ่มซ้ายหรือขวา (หรือกด ← / →) ให้ตรงกับทิศทางลูกศรตรงกลาง',
        'การ์ดรอบข้างอาจชี้คนละทิศ ให้เพิกเฉยต่อมัน',
      ],
      sessionNote: '48 รอบ ตอบให้เร็วที่สุด',
      beginBtnId: 'begin-flanker-btn',
    }));
    qs<HTMLButtonElement>('#begin-flanker-btn')!.addEventListener('click', startGame3);
  }

  // ---- Start game 3 ----
  function startGame3() {
    flankerEngine = new MeenFocusEngine(appSessionId);
    flankerEngine.initSequence();
    flankerBusy = false;
    flankerTimeoutHandle = null;
    renderGame3Shell();
    const firstTrial = flankerEngine.startGame();
    startGame3Trial(firstTrial);
  }

  // ---- Build the trial screen once per session ----
  // Everything that doesn't change between trials (HUD chrome, response
  // buttons) is only ever written to the DOM here. Re-writing the whole
  // screen on every trial was causing a visible flash each time; now only
  // the small bits that actually change (trial number, the stimulus itself)
  // get updated in place.
  function renderGame3Shell() {
    setScreen(`
      <div id="flanker-screen" class="relative flex flex-col items-center gap-5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6 text-center transition-shadow">
        ${gameHeaderHTML(2, 'รอบ', `1 / ${FLANKER_TOTAL}`, 'flanker-trial-num')}

        <div id="flanker-stimulus-slot" class="w-full"></div>
        <div class="text-[11px] tracking-[0.05em] text-[#8A8A8A]">แตะข้างใดข้างหนึ่ง หรือกด <kbd class="rounded border border-[rgba(15,15,15,0.15)] bg-[#F5F5F5] px-1.5 py-0.5">←</kbd> <kbd class="rounded border border-[rgba(15,15,15,0.15)] bg-[#F5F5F5] px-1.5 py-0.5">→</kbd></div>
        <div id="flanker-feedback" class="min-h-[32px] text-2xl font-extrabold" aria-live="assertive"></div>

        <div class="flex gap-3">
          <button id="flanker-left-btn" type="button" aria-label="Respond left" class="w-20 cursor-pointer transition-transform active:scale-95"><img src="${flankerBtnLeftSrc}" alt="←"></button>
          <button id="flanker-right-btn" type="button" aria-label="Respond right" class="w-20 cursor-pointer transition-transform active:scale-95"><img src="${flankerBtnRightSrc}" alt="→"></button>
        </div>
      </div>
    `);
    qs<HTMLButtonElement>('#flanker-left-btn')!.addEventListener('click', () => handleFlankerInput('left'));
    qs<HTMLButtonElement>('#flanker-right-btn')!.addEventListener('click', () => handleFlankerInput('right'));
  }

  // ---- Update the parts of the shell that change for this trial/phase ----
  function updateGame3Stimulus(trial: FlankerTrial, phase: 'fixation' | 'stimulus') {
    const trialIdx = flankerEngine.getCurrentTrialIndex() + 1;
    const trialNumEl = qs<HTMLElement>('#flanker-trial-num');
    if (trialNumEl) trialNumEl.textContent = `${trialIdx} / ${FLANKER_TOTAL}`;

    const slot = qs<HTMLElement>('#flanker-stimulus-slot');
    if (slot) {
      slot.innerHTML = phase === 'fixation'
        ? flankerFixationHTML()
        : `<div class="flex min-h-[88px] items-center justify-center gap-2">${flankerCardRowHTML(trial)}</div>`;
    }
  }

  // ---- Start a trial: fixation cross, then the arrow row (+ timeout + keys) ----
  function startGame3Trial(trial: FlankerTrial) {
    const screen = qs<HTMLElement>('#flanker-screen');
    screen?.classList.remove('ktp-glow-correct', 'ktp-shake-wrong');
    const fb = qs<HTMLElement>('#flanker-feedback');
    if (fb) { fb.innerHTML = ''; fb.className = 'min-h-[32px] text-2xl font-extrabold'; }

    updateGame3Stimulus(trial, 'fixation');
    flankerBusy = true;
    setTimeout(() => {
      if (destroyed) return;
      updateGame3Stimulus(trial, 'stimulus');
      // Stay busy until the card has actually painted, so a response landing in the gap
      // between render and paint can't be scored against a stale RT clock.
      requestAnimationFrame(() => {
        if (destroyed) return;
        flankerEngine.showStimulus();
        flankerBusy = false;
        document.addEventListener('keydown', handleFlankerKey);
        flankerTimeoutHandle = setTimeout(() => {
          submitFlankerResponse('timeout');
        }, 1200);
      });
    }, FLANKER_FIXATION_MS);
  }

  function handleFlankerInput(response: TargetDirection) {
    if (flankerBusy) return;
    if (flankerTimeoutHandle !== null) { clearTimeout(flankerTimeoutHandle); flankerTimeoutHandle = null; }
    submitFlankerResponse(response);
  }

  function handleFlankerKey(e: KeyboardEvent) {
    if (flankerBusy) return;
    let response: TargetDirection | null = null;
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') response = 'left';
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') response = 'right';
    if (!response) return;
    e.preventDefault();
    handleFlankerInput(response);
  }

  function submitFlankerResponse(response: TargetDirection | 'timeout') {
    if (flankerBusy) return;
    flankerBusy = true;
    document.removeEventListener('keydown', handleFlankerKey);

    const result = flankerEngine.handleResponse(response);

    // Fired only after handleResponse() has already stamped the reaction time, so
    // audio scheduling can't perturb the measurement.
    if (result.isCorrect) playCorrect(); else playIncorrect();

    // Show feedback
    const screen = qs<HTMLElement>('#flanker-screen');
    const fb = qs<HTMLElement>('#flanker-feedback');
    if (screen && fb) {
      if (result.isCorrect) {
        screen.classList.add('ktp-glow-correct');
        fb.textContent = '✓';
        fb.className = 'min-h-[32px] text-2xl font-extrabold text-[#3BF55C]';
      } else {
        screen.classList.add('ktp-shake-wrong');
        fb.innerHTML = response === 'timeout' ? `<img class="mx-auto w-11 drop-shadow" src="${flankerTimeoutSrc}" alt="Time out">` : '✗';
        fb.className = `min-h-[32px] text-2xl font-extrabold text-[${COLOR_DANGER}]`;
      }
    }

    // After feedback (500ms) + ITI (300ms)
    setTimeout(() => {
      if (destroyed) return;
      if (result.isGameOver) {
        renderGame3GameOver();
      } else {
        startGame3Trial(result.nextTrial!);
      }
    }, 800);
  }

  // ---- Game 3 game-over screen ----
  function renderGame3GameOver() {
    playComplete();
    savedGame3Payload = flankerEngine.getPayload();
    renderGame4Intro();
  }

  // ============================================================
  // GAME 4 — KONG'S NEIGHBORHOOD SPRINT (Public Goods Game)
  // ============================================================

  // ---- Game 4 intro screen ----
  function renderGame4Intro() {
    setScreen(introScreenHTML(3, {
      persona: [
        'พี่ก้อง (Kong) organizes a shared community fund with 3 neighbors every sprint. Everyone chips in what they choose, the pooled amount grows, then gets split evenly among the whole group.',
        'How much do you contribute when others might not?',
      ],
      rules: [
        'แต่ละรอบ คุณและเพื่อนอีก 3 คนจะได้รับคนละ 10 เหรียญ',
        'เลือกว่าจะใส่เหรียญเข้ากองกลางเท่าไหร่ ส่วนที่เหลือเก็บไว้เอง',
        'กองกลางจะถูกคูณด้วย ×1.6 แล้วหารแบ่งคืนให้ทั้ง 4 คนเท่าๆ กัน',
      ],
      sessionNote: '8 รอบ รอบละ 10 วินาที',
      beginBtnId: 'begin-pgg-btn',
    }));
    qs<HTMLButtonElement>('#begin-pgg-btn')!.addEventListener('click', startGame4);
  }

  // ---- Start game 4 ----
  function startGame4() {
    pggEngine = new KongNeighborhoodEngine(appSessionId);
    pggBusy = false;
    const roundInfo = pggEngine.startRound();
    renderGame4Round(roundInfo);
  }

  // ---- Render a round (contribution selector + countdown) ----
  function renderGame4Round(roundInfo: { roundIndex: number; endowment: number; timeLimitMs: number }) {
    setScreen(`
      ${gameHeaderHTML(3, 'ผลตอบแทนสะสม', `${pggLastCumulative}`)}

      <div class="flex flex-col items-center gap-5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6 text-center">
        <div class="text-xs font-bold text-[#5C5C5C]">รอบ ${roundInfo.roundIndex} / ${PGG_TOTAL_ROUNDS}</div>

        <div class="flex w-full max-w-[360px] items-center gap-2">
          <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(15,15,15,0.08)]">
            <div id="pgg-countdown-fill" class="h-full bg-[#3BF55C] transition-[width]" style="width:100%"></div>
          </div>
          <span id="pgg-countdown-num" class="min-w-[28px] text-right text-xs font-bold text-[#5C5C5C]">10s</span>
        </div>

        <p class="max-w-[420px] text-xs leading-[1.6] text-[#5C5C5C]">รอบนี้คุณมี <strong class="text-[#0F0F0F]">${roundInfo.endowment} เหรียญ</strong> จะใส่เข้ากองกลางเท่าไหร่?</p>

        <div class="flex w-full max-w-[360px] flex-col gap-3">
          <div class="flex justify-between">
            <div class="flex flex-col gap-0.5 text-left">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A8A]">บริจาค</span>
              <span id="pgg-contrib-val" class="text-2xl font-extrabold text-[#0F0F0F]">5</span>
            </div>
            <div class="flex flex-col items-end gap-0.5 text-right">
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8A8A]">เก็บไว้เอง</span>
              <span id="pgg-keep-val" class="text-2xl font-extrabold text-[${COLOR_GOLD}]">5</span>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <button type="button" id="pgg-minus-btn" aria-label="Decrease" class="h-8 w-8 shrink-0 cursor-pointer active:scale-90"><img src="${pggSliderMinusSrc}" alt="−"></button>
            <input type="range" min="0" max="10" step="1" value="5" id="pgg-slider" class="ktp-slider w-full" />
            <button type="button" id="pgg-plus-btn" aria-label="Increase" class="h-8 w-8 shrink-0 cursor-pointer active:scale-90"><img src="${pggSliderPlusSrc}" alt="+"></button>
          </div>
        </div>

        <button id="pgg-confirm-btn" type="button" class="w-full max-w-[360px] cursor-pointer rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]">ยืนยันการบริจาค</button>
      </div>
    `);

    const slider = qs<HTMLInputElement>('#pgg-slider')!;
    const contribEl = qs<HTMLElement>('#pgg-contrib-val')!;
    const keepEl = qs<HTMLElement>('#pgg-keep-val')!;
    const updateReadout = (v: number) => {
      contribEl.textContent = String(v);
      keepEl.textContent = String(10 - v);
    };
    slider.addEventListener('input', () => updateReadout(Number(slider.value)));

    qs<HTMLButtonElement>('#pgg-minus-btn')!.addEventListener('click', () => {
      slider.value = String(Math.max(0, Number(slider.value) - 1));
      updateReadout(Number(slider.value));
    });
    qs<HTMLButtonElement>('#pgg-plus-btn')!.addEventListener('click', () => {
      slider.value = String(Math.min(10, Number(slider.value) + 1));
      updateReadout(Number(slider.value));
    });

    qs<HTMLButtonElement>('#pgg-confirm-btn')!.addEventListener('click', () => {
      submitPggRound(Number(slider.value), false);
    });

    // ---- 10s countdown ----
    const startTs = Date.now();
    const fillEl = qs<HTMLElement>('#pgg-countdown-fill')!;
    const numEl = qs<HTMLElement>('#pgg-countdown-num')!;
    pggCountdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTs;
      const remainingMs = Math.max(0, 10000 - elapsed);
      const pct = Math.max(0, 100 * (1 - elapsed / 10000));
      fillEl.style.width = `${pct}%`;
      fillEl.style.background = pct < 25 ? COLOR_DANGER : pct < 55 ? '#F5D949' : COLOR_SAFE;
      numEl.textContent = `${Math.ceil(remainingMs / 1000)}s`;
    }, 100);
    pggCountdownTimeout = setTimeout(() => {
      submitPggRound(0, true);
    }, 10000);
  }

  function clearPggCountdown() {
    if (pggCountdownInterval !== null) { clearInterval(pggCountdownInterval); pggCountdownInterval = null; }
    if (pggCountdownTimeout !== null) { clearTimeout(pggCountdownTimeout); pggCountdownTimeout = null; }
  }

  // ---- Submit a round's contribution ----
  function submitPggRound(contribution: number, isTimeout: boolean) {
    if (pggBusy) return;
    pggBusy = true;
    clearPggCountdown();

    const roundLog = pggEngine.submitContribution(contribution, isTimeout);
    // Coins land when the pool pays out; a timeout forfeits the round instead.
    if (isTimeout) playIncorrect(); else playBank();
    pggLastCumulative = roundLog.userCumulativePayoff;
    showPggContributionPopup(roundLog.userContribution, () => renderGame4RoundResult(roundLog));
  }

  // A brief "you contributed N coins" toast before the full round summary, so
  // the amount just chosen registers on its own before the pool math appears.
  function showPggContributionPopup(amount: number, onDone: () => void): void {
    const popup = document.createElement('div');
    popup.className = 'fixed left-1/2 top-1/2 z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white px-5 py-3.5 text-sm font-bold text-[#0F0F0F] shadow-[0_12px_28px_rgba(15,15,15,0.15)] opacity-0 scale-90 transition-all duration-200';
    popup.innerHTML = `<img src="${pggCoinSrc}" alt="" class="h-7 w-7"><span>บริจาคไปแล้ว ${amount} เหรียญ</span>`;
    rootEl.appendChild(popup);
    requestAnimationFrame(() => popup.classList.remove('opacity-0', 'scale-90'));
    setTimeout(() => {
      if (destroyed) return;
      popup.classList.add('opacity-0', 'scale-90');
      setTimeout(() => { popup.remove(); onDone(); }, 200);
    }, 800);
  }

  // ---- Round result reveal screen ----
  function renderGame4RoundResult(roundLog: PggRoundLog) {
    const isLastRound = pggEngine.isGameOver();

    const aiCardsHTML = roundLog.aiContributions.map((ai) => {
      const info = PGG_ROLE_INFO[ai.role];
      return `
        <div class="flex flex-col items-center gap-0.5 rounded-xl border border-[rgba(15,15,15,0.1)] bg-[#FAFAFA] p-3">
          <img class="h-11 w-11 rounded-full object-cover shadow-sm" src="${info.avatar}" alt="">
          <span class="text-[13px] font-bold text-[#0F0F0F]">${info.displayName}</span>
          <span class="mt-0.5 font-mono text-base font-extrabold text-[${COLOR_GOLD}]">${ai.contribution} <small class="text-[10px] font-normal text-[#8A8A8A]">coins</small></span>
        </div>
      `;
    }).join('');

    setScreen(`
      <p class="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A8A8A]">
        ผลรอบที่ ${roundLog.roundIndex} ${roundLog.isTimeout ? `<span class="text-[${COLOR_DANGER}]">(หมดเวลา)</span>` : ''}
      </p>
      <div class="flex flex-col items-center gap-4 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-6">
        <div class="grid w-full grid-cols-2 gap-2.5">
          <div class="flex flex-col items-center gap-0.5 rounded-xl border border-[#3BF55C] bg-[rgba(59,245,92,0.12)] p-3">
            <img class="h-11 w-11 rounded-full object-cover shadow-sm" src="${pggAvatarPlayerSrc}" alt="">
            <span class="text-[13px] font-bold text-[#0F0F0F]">คุณ</span>
            <span class="font-mono text-base font-extrabold text-[${COLOR_GOLD}]">${roundLog.userContribution} <small class="text-[10px] font-normal text-[#8A8A8A]">coins</small></span>
          </div>
          ${aiCardsHTML}
        </div>

        <div class="w-full overflow-hidden rounded-xl border border-[rgba(15,15,15,0.08)]">
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>กองกลางรวม</span><span>${roundLog.totalPool} เหรียญ</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>คูณ ×1.6</span><span>${roundLog.multipliedPool}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>หาร 4 คน (ส่วนของคุณ)</span><span>${roundLog.individualShare}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] bg-[#F5F5F5] px-4 py-2.5 text-xs font-bold text-[#0F0F0F]"><span>ผลตอบแทนรอบนี้</span><span>${roundLog.userRoundPayoff} pts</span></div>
          <div class="flex justify-between px-4 py-2.5 text-xs font-bold text-[${COLOR_GOLD}]"><span>ผลตอบแทนสะสม</span><span>${roundLog.userCumulativePayoff} pts</span></div>
        </div>

        <button id="pgg-continue-btn" type="button" class="w-full cursor-pointer rounded-full bg-[#0F0F0F] py-3.5 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]">
          ${isLastRound ? 'ดูผลลัพธ์รวม' : 'ไปต่อ'}
        </button>
      </div>
    `);

    qs<HTMLButtonElement>('#pgg-continue-btn')!.addEventListener('click', () => {
      playClick();
      pggBusy = false;
      if (isLastRound) {
        renderGame4GameOver();
      } else {
        const roundInfo = pggEngine.startRound();
        renderGame4Round(roundInfo);
      }
    });
  }

  // ---- Game 4 game-over screen ----
  function renderGame4GameOver() {
    playComplete();
    savedGame4Payload = pggEngine.getPayload();
    renderSessionSummary();
  }

  // ============================================================
  // COMBINED SESSION SUMMARY — Radar Chart + Full JSON Export
  // ============================================================

  function drawRadarChart(ctx: CanvasRenderingContext2D, size: number, radar: RadarChartOutput) {
    const labels: string[][] = [
      ['Risk', 'Tolerance'],
      ['Learning', 'Agility'],
      ['Critical', 'Thinking'],
      ['Decision Making', 'Under Pressure'],
      ['Collaboration', 'Mindset'],
      ['Resilience &', 'Adaptability'],
    ];
    const values = [
      radar.axes.riskTolerance,
      radar.axes.learningAgility,
      radar.axes.criticalThinking,
      radar.axes.decisionMakingUnderPressure,
      radar.axes.collaborationMindset,
      radar.axes.resilienceAndAdaptability,
    ];
    const N = 6;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.30;

    function pt(i: number, r: number): [number, number] {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    }

    ctx.clearRect(0, 0, size, size);

    // grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (R * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const [x, y] = pt(i % N, r);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = COLOR_BORDER;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // spokes + axis labels
    ctx.strokeStyle = COLOR_BORDER;
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      const [lx, ly] = pt(i, R + 32);
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `600 10px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      const lines = labels[i];
      lines.forEach((line, li) => {
        ctx.fillText(line, lx, ly + li * 11 - ((lines.length - 1) * 5.5));
      });
    }

    // data polygon
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const idx = i % N;
      const r = (R * values[idx]) / 100;
      const [x, y] = pt(idx, r);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `${COLOR_SAFE}4D`;
    ctx.fill();
    ctx.strokeStyle = COLOR_SAFE;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // data points + value labels
    for (let i = 0; i < N; i++) {
      const r = (R * values[i]) / 100;
      const [x, y] = pt(i, r);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_SAFE;
      ctx.fill();

      ctx.fillStyle = COLOR_GOLD;
      ctx.font = `700 11px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      ctx.fillText(values[i].toFixed(0), x, y - 8);
    }

    // overall index badge
    ctx.fillStyle = COLOR_SURFACE_2;
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - 46, cy - 16, 92, 32, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLOR_TEXT_FAINT;
    ctx.font = `600 8px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillText('OVERALL', cx, cy - 3);
    ctx.fillStyle = COLOR_GOLD;
    ctx.font = `700 15px ${FONT_BODY}`;
    ctx.fillText(radar.overallIndex.toFixed(1), cx, cy + 11);
  }

  function renderSessionSummary() {
    if (!allGamesComplete()) return;

    const inputMetrics: CompleteAssessmentPayload = {
      sessionId: appSessionId,
      game1_bart: savedPayload!.summaryMetrics,
      game2_wcst: savedGame2Payload!.summaryMetrics,
      game3_flanker: savedGame3Payload!.summaryMetrics,
      game4_pgg: savedGame4Payload!.summaryMetrics,
    };
    const radar = calculateRadarProfile(inputMetrics);

    setScreen(`
      <div class="ktp-fade-up flex flex-col items-center gap-5 rounded-2xl border border-[rgba(15,15,15,0.1)] bg-white p-8 text-center">
        <h2 class="text-xl font-extrabold tracking-[-0.02em] text-[#0F0F0F]">ประมวลผลเกมสำเร็จ!</h2>
        <p class="max-w-[420px] text-xs leading-[1.6] text-[#5C5C5C]">สรุปผลการเล่นของคุณจากทั้ง 4 มินิเกม</p>

        <canvas id="radar-canvas"></canvas>

        <div class="w-full max-w-[420px] overflow-hidden rounded-xl border border-[rgba(15,15,15,0.08)]">
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] bg-[#F5F5F5] px-4 py-3 text-xs font-bold">
            <span class="text-[#0F0F0F]">คะแนนรวม</span><span class="text-[${COLOR_GOLD}]">${radar.overallIndex}</span>
          </div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Risk Tolerance</span><span class="font-bold text-[#0F0F0F]">${radar.axes.riskTolerance}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Learning Agility</span><span class="font-bold text-[#0F0F0F]">${radar.axes.learningAgility}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Critical Thinking</span><span class="font-bold text-[#0F0F0F]">${radar.axes.criticalThinking}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Decision Making Under Pressure</span><span class="font-bold text-[#0F0F0F]">${radar.axes.decisionMakingUnderPressure}</span></div>
          <div class="flex justify-between border-b border-[rgba(15,15,15,0.08)] px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Collaboration Mindset</span><span class="font-bold text-[#0F0F0F]">${radar.axes.collaborationMindset}</span></div>
          <div class="flex justify-between px-4 py-2.5 text-xs text-[#5C5C5C]"><span>Resilience &amp; Adaptability</span><span class="font-bold text-[#0F0F0F]">${radar.axes.resilienceAndAdaptability}</span></div>
        </div>

        <a href="/decoder" class="w-full max-w-[420px] cursor-pointer rounded-full bg-[#0F0F0F] py-4 text-xs font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]">
          ไปขั้นตอนถัดไป →
        </a>
      </div>
    `);

    const canvas = qs<HTMLCanvasElement>('#radar-canvas')!;
    const size = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    drawRadarChart(ctx, size, radar);

    opts.onComplete(radar);
  }

  // ---- Entry ----
  rootEl.classList.add('relative');
  renderMuteButton();
  renderGame1Intro();

  // ---- Cleanup ----
  return function destroy() {
    destroyed = true;
    document.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions);
    document.removeEventListener('keydown', handleFlankerKey);
    clearPggCountdown();
    if (flankerTimeoutHandle !== null) { clearTimeout(flankerTimeoutHandle); flankerTimeoutHandle = null; }
    rootEl.innerHTML = '';
  };
}
