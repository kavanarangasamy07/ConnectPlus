import { SpeechController } from './speechController.js';
import { showToast } from './toastController.js';
import { LiveMessage } from '../../shared/types.js';

export interface CaptionEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

export class LiveConversationController {
  private speechCtrl: SpeechController | null = null;
  private entries: CaptionEntry[] = [];
  private deletedBackup: CaptionEntry[] = [];
  private currentSpeaker = 'Speaker 1';
  private autoScroll = true;
  private isPaused = false;
  private fontSize = 24; // 16 to 64 px
  private socket: WebSocket | null = null;
  private currentRoomCode: string | null = null;

  private viewportEl: HTMLElement | null = null;
  private fontSizeSlider: HTMLInputElement | null = null;
  private fontSizeValEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private roomStatusEl: HTMLElement | null = null;

  public init(
    viewport: HTMLElement,
    fontSizeSlider: HTMLInputElement,
    fontSizeValEl: HTMLElement,
    statusEl: HTMLElement,
    roomStatusEl: HTMLElement
  ): void {
    this.viewportEl = viewport;
    this.fontSizeSlider = fontSizeSlider;
    this.fontSizeValEl = fontSizeValEl;
    this.statusEl = statusEl;
    this.roomStatusEl = roomStatusEl;

    // Load saved font size
    const savedSize = localStorage.getItem('connectplus_live_font_size');
    if (savedSize) {
      this.fontSize = parseInt(savedSize, 10);
      this.fontSizeSlider.value = this.fontSize.toString();
      this.fontSizeValEl.textContent = `${this.fontSize}px`;
      this.applyFontSize();
    }

    this.fontSizeSlider.addEventListener('input', (e) => {
      this.fontSize = parseInt((e.target as HTMLInputElement).value, 10);
      this.fontSizeValEl.textContent = `${this.fontSize}px`;
      localStorage.setItem('connectplus_live_font_size', this.fontSize.toString());
      this.applyFontSize();
    });

    // Independent SpeechController instance specifically for Live Conversation
    this.speechCtrl = new SpeechController({
      statusEl: this.statusEl,
      outputEl: null,
      onResult: (text: string, isFinal: boolean) => {
        if (this.isPaused || !text.trim()) return;
        if (isFinal) {
          this.addCaption(this.currentSpeaker, text.trim());
        }
      }
    });

    this.render();
  }

  public setSpeaker(name: string): void {
    this.currentSpeaker = name.trim() || 'Speaker';
  }

  public toggleListening(): boolean {
    if (!this.speechCtrl) return false;
    if (this.speechCtrl.isListening) {
      this.speechCtrl.stop();
      return false;
    } else {
      this.speechCtrl.start();
      return true;
    }
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    showToast(this.isPaused ? 'Captions paused' : 'Captions resumed', 'info');
    return this.isPaused;
  }

  public toggleAutoScroll(): boolean {
    this.autoScroll = !this.autoScroll;
    showToast(this.autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled', 'info');
    return this.autoScroll;
  }

  public addCaption(speaker: string, text: string): void {
    const entry: CaptionEntry = {
      id: 'cap-' + Date.now() + Math.random().toString(36).substr(2, 4),
      speaker,
      text,
      timestamp: Date.now()
    };
    this.entries.push(entry);
    this.render();

    // Broadcast over WebSocket if connected to a Live Room
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentRoomCode) {
      const msg: LiveMessage = {
        type: 'caption',
        room: this.currentRoomCode,
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp
      };
      this.socket.send(JSON.stringify(msg));
    }
  }

  public copyTranscript(): void {
    if (this.entries.length === 0) {
      showToast('No transcript to copy yet.', 'info');
      return;
    }
    const fullText = this.entries
      .map((e) => `[${formatTime(e.timestamp)}] ${e.speaker}: ${e.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('Transcript copied to clipboard!', 'success');
    });
  }

  public downloadTranscript(): void {
    if (this.entries.length === 0) {
      showToast('No transcript to download yet.', 'info');
      return;
    }
    const fullText =
      `ConnectPlus Live Conversation Transcript\n` +
      `Exported: ${new Date().toLocaleString()}\n` +
      `----------------------------------------\n\n` +
      this.entries
        .map((e) => `[${formatTime(e.timestamp)}] ${e.speaker}:\n${e.text}\n`)
        .join('\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ConnectPlus_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded transcript (.txt)', 'success');
  }

  public clear(): void {
    if (this.entries.length === 0) return;
    this.deletedBackup = [...this.entries];
    this.entries = [];
    this.render();

    showToast('Conversation cleared.', 'info', {
      label: 'Undo',
      onClick: () => {
        this.entries = [...this.deletedBackup];
        this.render();
      }
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentRoomCode) {
      this.socket.send(JSON.stringify({ type: 'clear', room: this.currentRoomCode }));
    }
  }

  // Live WebSocket Caption Sharing Room
  public joinRoom(roomCode: string, speakerName?: string): void {
    const code = roomCode.trim().toUpperCase();
    if (!code) return;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.currentRoomCode = code;
        const joinMsg: LiveMessage = {
          type: 'join',
          room: code,
          speaker: speakerName || this.currentSpeaker
        };
        this.socket!.send(JSON.stringify(joinMsg));
        if (this.roomStatusEl) {
          this.roomStatusEl.textContent = `🟢 Connected to Room: ${code}`;
          this.roomStatusEl.style.color = '#10B981';
        }
        showToast(`Joined live caption room "${code}"!`, 'success');
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as LiveMessage;
          if (msg.type === 'caption' && msg.text) {
            // Avoid adding our own duplicate if sent back
            const isLocal = msg.speaker === this.currentSpeaker && this.entries.some((e) => e.text === msg.text && Math.abs(e.timestamp - (msg.timestamp || 0)) < 2000);
            if (!isLocal) {
              this.entries.push({
                id: 'remote-' + Date.now(),
                speaker: msg.speaker || 'Guest',
                text: msg.text,
                timestamp: msg.timestamp || Date.now()
              });
              this.render();
            }
          } else if (msg.type === 'clear') {
            this.entries = [];
            this.render();
            showToast('Room host cleared captions', 'info');
          }
        } catch {}
      };

      this.socket.onerror = () => {
        if (this.roomStatusEl) {
          this.roomStatusEl.textContent = '⚠️ Live room connection failed';
          this.roomStatusEl.style.color = '#EF4444';
        }
      };

      this.socket.onclose = () => {
        if (this.roomStatusEl) {
          this.roomStatusEl.textContent = 'Disconnected from room';
          this.roomStatusEl.style.color = 'var(--text-muted)';
        }
      };
    } catch {
      showToast('Could not establish WebSocket room connection', 'danger');
    }
  }

  private applyFontSize(): void {
    if (this.viewportEl) {
      this.viewportEl.style.fontSize = `${this.fontSize}px`;
    }
  }

  private render(): void {
    if (!this.viewportEl) return;
    this.viewportEl.innerHTML = '';

    if (this.entries.length === 0) {
      this.viewportEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <p style="font-size: 1.15rem;">No conversation yet. Tap <strong>Start Conversation</strong> to speak, or connect a Room Code to read live shared captions.</p>
        </div>`;
      return;
    }

    this.entries.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'caption-entry';
      item.innerHTML = `
        <div class="caption-meta">
          <span class="caption-speaker-tag">${escapeHtml(entry.speaker)}</span>
          <span class="caption-time">${formatTime(entry.timestamp)}</span>
        </div>
        <div class="caption-body">${escapeHtml(entry.text)}</div>
      `;
      this.viewportEl!.appendChild(item);
    });

    if (this.autoScroll) {
      this.viewportEl.scrollTop = this.viewportEl.scrollHeight;
    }
  }
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
