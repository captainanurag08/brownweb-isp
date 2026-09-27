import { useEffect, useRef } from 'react';
import { browserSocket } from '../../services/websocket';
import type { ServerMessage } from '../../types';

const SPECIAL_KEYS = new Set([
  'Enter', 'Backspace', 'Tab', 'Delete', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Shift', 'Control', 'Alt', 'Meta',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]);

export function BrowserView({ tabId }: { tabId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const lastMoveSent = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const unsub = browserSocket.onMessage((msg: ServerMessage) => {
      if (msg.type !== 'tab.frame' || msg.tabId !== tabId) return;
      createImageBitmap(msg.blob)
        .then((bitmap) => {
          if (cancelled) {
            bitmap.close();
            return;
          }
          const canvas = canvasRef.current;
          if (!canvas) {
            bitmap.close();
            return;
          }
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
          bitmap.close();
        })
        .catch(() => {
          /* a corrupt/partial frame is not worth surfacing - the next one will arrive shortly */
        });
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [tabId]);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      browserSocket.send({ type: 'viewport.resize', tabId, width: Math.round(rect.width), height: Math.round(rect.height) });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [tabId]);

  function toRemoteCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function focusHiddenInput() {
    hiddenInputRef.current?.focus();
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'default', touchAction: 'none' }}
        onPointerDown={(e) => {
          focusHiddenInput();
          const { x, y } = toRemoteCoords(e.clientX, e.clientY);
          browserSocket.send({ type: 'input.mouse', tabId, action: 'down', x, y, button: e.button === 2 ? 'right' : 'left' });
        }}
        onPointerUp={(e) => {
          const { x, y } = toRemoteCoords(e.clientX, e.clientY);
          browserSocket.send({ type: 'input.mouse', tabId, action: 'up', x, y, button: e.button === 2 ? 'right' : 'left' });
        }}
        onPointerMove={(e) => {
          const now = performance.now();
          if (now - lastMoveSent.current < 16) return; // ~60/s cap is plenty for a remote cursor
          lastMoveSent.current = now;
          const { x, y } = toRemoteCoords(e.clientX, e.clientY);
          browserSocket.send({ type: 'input.mouse', tabId, action: 'move', x, y });
        }}
        onWheel={(e) => {
          browserSocket.send({ type: 'input.wheel', tabId, deltaX: e.deltaX, deltaY: e.deltaY });
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Hidden input: captures real typed/composed/pasted text robustly (IME, autocorrect, paste),
          separate from the special-key handling below. See docs/DEPLOYMENT.md limitations. */}
      <input
        ref={hiddenInputRef}
        aria-hidden
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: 0, left: 0, pointerEvents: 'none' }}
        onKeyDown={(e) => {
          if (SPECIAL_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
            browserSocket.send({ type: 'input.key', tabId, action: 'down', key: e.key });
            if (['Backspace', 'Tab', 'Enter'].includes(e.key)) e.preventDefault();
          }
        }}
        onKeyUp={(e) => {
          if (SPECIAL_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
            browserSocket.send({ type: 'input.key', tabId, action: 'up', key: e.key });
          }
        }}
        onInput={(e) => {
          const value = e.currentTarget.value;
          if (value) {
            browserSocket.send({ type: 'input.text', tabId, text: value });
            e.currentTarget.value = '';
          }
        }}
      />
    </div>
  );
}
