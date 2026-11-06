// Radio messages shown in the HUD. One message at a time, queued.

export interface RadioMsg {
  from: string;
  text: string;
  dur: number;
}

export interface SayOpts {
  /** Messages with the same key are skipped while on cooldown. */
  key?: string;
  cooldown?: number;
  /** Jump the queue and replace the current message. */
  urgent?: boolean;
  dur?: number;
}

export class Radio {
  current: RadioMsg | null = null;
  private queue: RadioMsg[] = [];
  private t = 0;
  private time = 0;
  private cooldowns = new Map<string, number>();
  /** Every message said, for the log and tests. */
  readonly log: RadioMsg[] = [];

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
    if (this.queue.length > 4) this.queue.splice(1, this.queue.length - 4);
    return true;
  }

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

  clear(): void {
    this.queue.length = 0;
    this.current = null;
  }

  get busy(): boolean {
    return this.current !== null || this.queue.length > 0;
  }
}
