import {
  AllAppEvents,
  AppEventName,
  GamificationEffects,
  EffectEventName,
  SpecificAppEvent,
  SpecificEffect,
} from './types';

type Listener<T> = (event: T) => void;

/**
 * High-performance, zero-dependency, typed Pub/Sub event bus with event buffering.
 * If events are emitted before a listener is registered (e.g., during lazy loading),
 * they are enqueued and immediately flushed upon first listener registration.
 */
export class BufferedEventBus<TMap extends Record<string, any>> {
  private listeners: Map<keyof TMap, Set<Listener<any>>> = new Map();
  private buffer: Array<{ type: keyof TMap; data: any }> = [];
  private maxBuffer: number;

  constructor(maxBuffer = 100) {
    this.maxBuffer = maxBuffer;
  }

  /**
   * Subscribes to an event type. Returns an unsubscribe function.
   * Immediately replays any enqueued buffered events matching this type.
   */
  on<K extends keyof TMap>(type: K, handler: Listener<TMap[K]>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Replay buffered events matching this type
    const matched = this.buffer.filter((item) => item.type === type);
    this.buffer = this.buffer.filter((item) => item.type !== type);
    matched.forEach((item) => {
      try {
        handler(item.data);
      } catch (err) {
        console.error(`[EventBus] Error replaying buffered event "${String(type)}":`, err);
      }
    });

    return () => this.off(type, handler);
  }

  /**
   * Unsubscribes a listener from an event type.
   */
  off<K extends keyof TMap>(type: K, handler: Listener<TMap[K]>): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  /**
   * Emits an event. If no listeners are attached yet, buffers it up to maxBuffer.
   */
  emit<K extends keyof TMap>(type: K, data: TMap[K]): void {
    const set = this.listeners.get(type);
    if (!set || set.size === 0) {
      if (this.buffer.length >= this.maxBuffer) {
        this.buffer.shift(); // Evict oldest event if buffer is full
      }
      this.buffer.push({ type, data });
      return;
    }

    set.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error handling event "${String(type)}":`, err);
      }
    });
  }

  /**
   * Clears all listeners and buffered queues (useful for testing).
   */
  clear(): void {
    this.listeners.clear();
    this.buffer = [];
  }

  /**
   * Returns current count of buffered events waiting for listeners.
   */
  get bufferedCount(): number {
    return this.buffer.length;
  }
}

/**
 * Creates an AppEvent with metadata.
 */
export function createAppEvent<K extends AppEventName>(
  type: K,
  payload: AllAppEvents[K],
  lectureId?: number
): SpecificAppEvent<K> {
  return {
    type,
    payload,
    meta: {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      lectureId,
    },
  } as SpecificAppEvent<K>;
}

/**
 * Creates a GamificationEffect with metadata.
 */
export function createEffect<K extends EffectEventName>(
  type: K,
  payload: GamificationEffects[K]
): SpecificEffect<K> {
  return {
    type,
    payload,
    meta: {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
    },
  } as SpecificEffect<K>;
}

// Global Singletons
export const appEventBus = new BufferedEventBus<{
  [K in AppEventName]: SpecificAppEvent<K>;
}>();

export const effectBus = new BufferedEventBus<{
  [K in EffectEventName]: SpecificEffect<K>;
}>();
