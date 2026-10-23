/**
 * Event bus — pure TypeScript, no native deps.
 * Re-exports the desktop event bus type shape.
 */
type Handler<T = unknown> = (payload: T) => void;

type EventMap = {
  trackStarted: import('@nuclearplayer/model').Track;
  trackFinished: void;
  playbackSkipped: { positionMs: number };
  playbackStopped: { positionMs: number };
  playbackPaused: { positionMs: number };
  playbackResumed: { positionMs: number };
  playbackSeeked: { fromMs: number; toMs: number };
  streamSourceInvalid: import('@nuclearplayer/model').Track;
};

class EventBus {
  private handlers: Map<string, Handler[]> = new Map();

  on<K extends keyof EventMap>(
    event: K,
    handler: Handler<EventMap[K]>,
  ): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler);
    this.handlers.set(event, list);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      list.filter((h) => h !== handler),
    );
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const list = this.handlers.get(event) ?? [];
    list.forEach((h) => h(payload as unknown));
  }
}

export const eventBus = new EventBus();
