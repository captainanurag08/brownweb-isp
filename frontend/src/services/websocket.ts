import type { ClientMessage, ServerMessage } from '../types';

type Listener = (msg: ServerMessage) => void;
type StatusListener = (status: 'connecting' | 'open' | 'closed') => void;

class BrowserSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectDelay = 1000;
  private shouldReconnect = true;
  private status: 'connecting' | 'open' | 'closed' = 'closed';

  connect(): void {
    this.shouldReconnect = true;
    this.open();
  }

  private open(): void {
    this.setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    this.socket.binaryType = 'arraybuffer';

    this.socket.addEventListener('open', () => {
      this.reconnectDelay = 1000;
      this.setStatus('open');
    });

    this.socket.addEventListener('message', (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryFrame(event.data);
        return;
      }
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        this.listeners.forEach((l) => l(msg));
      } catch {
        // ignore malformed frames
      }
    });

    this.socket.addEventListener('close', () => {
      this.setStatus('closed');
      if (this.shouldReconnect) {
        setTimeout(() => this.open(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.7, 15_000);
      }
    });

    this.socket.addEventListener('error', () => {
      this.socket?.close();
    });
  }

  private handleBinaryFrame(data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (bytes[0] !== 0x01) return; // unrecognized marker, ignore
    const tabId = new TextDecoder('ascii').decode(bytes.subarray(1, 37));
    const blob = new Blob([bytes.subarray(37)], { type: 'image/jpeg' });
    this.listeners.forEach((l) => l({ type: 'tab.frame', tabId, blob }));
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.socket?.close();
  }

  private setStatus(status: 'connecting' | 'open' | 'closed') {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  getStatus() {
    return this.status;
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}

export const browserSocket = new BrowserSocket();
