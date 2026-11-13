// Plays video in one HTML <video> element laid over the game canvas. The
// element is made once and never destroyed: phones only let a page play
// video with sound after a tap, and unlock() spends the first tap on this
// element so later videos can start on their own. DOM only, no Phaser.

export type VideoEnd = 'ended' | 'skipped' | 'error';

export interface PlayOptions {
  muted: boolean;
  fit: 'contain' | 'cover';
  canSkip: boolean;
  /** How long to hold to skip, ms. */
  holdMs: number;
}

export interface VideoPlayer {
  /** Call inside a tap (pointerup) handler. Safe to call on every tap. */
  unlock(): void;
  /** Show and play `url`. Resolves when it ends, is skipped, or fails. */
  play(url: string, o: PlayOptions): Promise<VideoEnd>;
  /** Stop and hide; a running play() resolves 'skipped'. */
  stop(): void;
}

const FONT = '"Press Start 2P", monospace';

/** A 0.1 s silent WAV, made in memory, for unlock(). */
function silentWav(): string {
  const rate = 8000;
  const n = rate / 10;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8-bit
  str(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); // silence
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class HtmlVideoPlayer implements VideoPlayer {
  private readonly root: HTMLDivElement;
  private readonly el: HTMLVideoElement;
  private readonly hint: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly tapBtn: HTMLButtonElement;
  private unlocked = false;
  /** Resolves the running play(); null when idle. */
  private finish: ((r: VideoEnd) => void) | null = null;
  private opts: PlayOptions | null = null;
  private holdStart = 0;
  private holdTimer = 0;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'wof-video';
    Object.assign(this.root.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '10',
      display: 'none',
      background: '#111214',
      touchAction: 'none',
      userSelect: 'none',
    });
    this.el = document.createElement('video');
    this.el.setAttribute('playsinline', '');
    this.el.setAttribute('webkit-playsinline', '');
    this.el.setAttribute('disablepictureinpicture', '');
    this.el.preload = 'auto';
    Object.assign(this.el.style, { width: '100%', height: '100%', display: 'block', background: '#111214' });

    const label = (css: Partial<CSSStyleDeclaration>) => {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'absolute', left: '0', right: '0', textAlign: 'center', font: `10px ${FONT}`, color: '#b9bdb0', pointerEvents: 'none' }, css);
      return d;
    };
    this.hint = label({ bottom: '18px' });
    this.bar = document.createElement('div');
    Object.assign(this.bar.style, { position: 'absolute', left: '0', bottom: '0', height: '4px', width: '0', background: '#f2d43d', pointerEvents: 'none' });
    this.tapBtn = document.createElement('button');
    this.tapBtn.textContent = 'TAP TO PLAY';
    Object.assign(this.tapBtn.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'none',
      padding: '14px 20px',
      font: `12px ${FONT}`,
      color: '#f2d43d',
      background: '#262a22',
      border: '2px solid #f2d43d',
    });
    this.tapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.tapBtn.style.display = 'none';
      this.el.play().catch(() => this.end('error'));
    });

    this.root.append(this.el, this.hint, this.bar, this.tapBtn);
    container.appendChild(this.root);

    // Hold anywhere to skip. preventDefault stops the touch from also
    // reaching the game as a tap once the next scene is up.
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.tapBtn) return;
      e.preventDefault();
      this.holdStart = performance.now();
    });
    const release = (e: Event) => {
      e.preventDefault();
      this.holdStart = 0;
    };
    this.root.addEventListener('pointerup', release);
    this.root.addEventListener('pointercancel', release);
    // Not on the button: cancelling its touchend would also cancel its click.
    this.root.addEventListener('touchend', (e) => e.target !== this.tapBtn && e.preventDefault());

    this.el.addEventListener('ended', () => this.end('ended'));
    this.el.addEventListener('error', () => this.finish && this.end('error'));
    this.el.addEventListener('waiting', () => this.finish && this.setHint('LOADING...'));
    this.el.addEventListener('playing', () => this.setHint(this.opts?.canSkip ? 'HOLD TO SKIP' : ''));
    document.addEventListener('visibilitychange', () => {
      if (!this.finish) return;
      if (document.hidden) this.el.pause();
      else this.el.play().catch(() => (this.tapBtn.style.display = 'block'));
    });
    window.addEventListener('keydown', (e) => {
      if (!this.finish || !this.opts?.canSkip) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') this.end('skipped');
    });
  }

  unlock(): void {
    if (this.unlocked || this.finish) return;
    this.unlocked = true;
    const url = silentWav();
    this.el.muted = false;
    this.el.src = url;
    // Playing once inside a tap lets this element play with sound later.
    // If a real video has started meanwhile (this.finish set), leave it alone.
    this.el
      .play()
      .then(
        () => {
          if (!this.finish) this.el.pause();
        },
        () => {
          if (!this.finish) this.unlocked = false;
        },
      )
      .finally(() => {
        if (!this.finish) this.el.removeAttribute('src');
        URL.revokeObjectURL(url);
      });
  }

  play(url: string, o: PlayOptions): Promise<VideoEnd> {
    this.stop();
    this.opts = o;
    this.root.style.display = 'block';
    this.el.style.objectFit = o.fit;
    this.el.muted = o.muted;
    this.el.src = url;
    this.setHint('LOADING...');
    const done = new Promise<VideoEnd>((resolve) => (this.finish = resolve));
    this.el.play().catch((err: DOMException) => {
      // Not allowed to start without a tap: ask for one.
      if (err?.name === 'NotAllowedError') {
        this.tapBtn.style.display = 'block';
        this.setHint('');
      } else if (err?.name !== 'AbortError') {
        this.end('error');
      }
    });
    this.tick();
    return done;
  }

  stop(): void {
    if (this.finish) this.end('skipped');
  }

  private setHint(s: string): void {
    this.hint.textContent = s;
  }

  /** Grow the hold-to-skip bar while a press is held; skip when it fills. */
  private tick = (): void => {
    if (!this.finish) return;
    const o = this.opts;
    const held = this.holdStart && o?.canSkip ? performance.now() - this.holdStart : 0;
    this.bar.style.width = `${Math.min(100, (held / (o?.holdMs ?? 800)) * 100)}%`;
    if (o && held >= o.holdMs) {
      this.end('skipped');
      return;
    }
    this.holdTimer = requestAnimationFrame(this.tick);
  };

  private end(r: VideoEnd): void {
    const f = this.finish;
    this.finish = null;
    this.opts = null;
    this.holdStart = 0;
    cancelAnimationFrame(this.holdTimer);
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    this.root.style.display = 'none';
    this.tapBtn.style.display = 'none';
    this.bar.style.width = '0';
    f?.(r);
  }
}
