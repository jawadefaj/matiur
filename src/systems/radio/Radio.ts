// Radio messages shown in the HUD. One message at a time, queued.

export interface RadioMsg {
  /** Speaker, e.g. 'Sherdil Two'. */
  from: string;
  text: string;
  /** Seconds on screen. */
  dur: number;
}

export interface SayOpts {
  /** Messages with the same key are skipped while on cooldown. */
  key?: string;
  /** Seconds before the same key can play again. Without it, a keyed message plays only once. */
  cooldown?: number;
  /** Jump the queue and replace the current message. */
  urgent?: boolean;
  /** Seconds on screen; the default grows with the text length. */
  dur?: number;
}

/** The HUD radio. World owns one; UIScene shows `current`. */
export class Radio {
  /** Message on screen now, or null. */
  current: RadioMsg | null = null;
  private queue: RadioMsg[] = [];
  /** Seconds the current message has been shown. */
  private t = 0;
  /** Radio clock in seconds, for cooldowns. */
  private time = 0;
  /** Key -> radio time when it may play again. */
  private cooldowns = new Map<string, number>();
  /** Every message said, in order, including ones dropped from the queue. */
  readonly log: RadioMsg[] = [];

  /** Queue a message. Returns false if its key is still on cooldown. */
  say(from: string, text: string, opts: SayOpts = {}): boolean {
    if (opts.key) {
      const until = this.cooldowns.get(opts.key);
      if (until !== undefined && this.time < until) return false;
      this.cooldowns.set(opts.key, this.time + (opts.cooldown ?? 1e9));
    }
    const msg: RadioMsg = { from, text, dur: opts.dur ?? 1.8 + text.length * 0.045 };
    this.log.push(msg);
    if (opts.urgent) {
      this.queue.unshift(msg);
      this.current = null;
      this.t = 0;
    } else {
      this.queue.push(msg);
    }
    // Keep the backlog short so calls stay relevant.
    // Trimming keeps the head of the queue and its last three entries.
    if (this.queue.length > 4) this.queue.splice(1, this.queue.length - 4);
    return true;
  }

  /** Advance the clock; retire the current message after its `dur` and show the next. */
  update(dt: number): void {
    this.time += dt;
    if (this.current) {
      this.t += dt;
      if (this.t >= this.current.dur) this.current = null;
    }
    if (!this.current && this.queue.length > 0) {
      this.current = this.queue.shift()!;
      this.t = 0;
    }
  }

  /** Drop the queue and the current message. Cooldowns and the log are kept. */
  clear(): void {
    this.queue.length = 0;
    this.current = null;
  }

  /** A message is showing or waiting. */
  get busy(): boolean {
    return this.current !== null || this.queue.length > 0;
  }
}
