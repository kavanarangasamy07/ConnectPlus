import { tts } from './ttsController.js';
import { SpeechController } from './speechController.js';
import { showToast } from './toastController.js';
import { AssistantRequest, AssistantResponse } from '../../shared/types.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class AssistantController {
  private messages: Message[] = [];
  private speechCtrl: SpeechController | null = null;
  private isGenerating = false;

  private messagesContainer: HTMLElement | null = null;
  private chipsContainer: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private micBtn: HTMLButtonElement | null = null;

  public init(
    messagesContainer: HTMLElement,
    chipsContainer: HTMLElement,
    inputEl: HTMLInputElement,
    sendBtn: HTMLButtonElement,
    micBtn: HTMLButtonElement
  ): void {
    this.messagesContainer = messagesContainer;
    this.chipsContainer = chipsContainer;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.micBtn = micBtn;

    // Default welcome message
    this.messages = [
      {
        role: 'assistant',
        content:
          "👋 Hello! I am your ConnectPlus AI Assistant. Ask me anything about using the Communication Board, Two-Way Speech, Live Captions, Translations, or Emergency SOS!"
      }
    ];

    // Speech controller for voice input to assistant
    this.speechCtrl = new SpeechController({
      statusEl: null,
      outputEl: null,
      onResult: (text: string, isFinal: boolean) => {
        if (this.inputEl) {
          this.inputEl.value = text;
          if (isFinal) {
            this.sendMessage(text);
          }
        }
      }
    });

    this.sendBtn.addEventListener('click', () => {
      this.handleSend();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSend();
      }
    });

    this.micBtn.addEventListener('click', () => {
      if (!this.speechCtrl) return;
      if (this.speechCtrl.isListening) {
        this.speechCtrl.stop();
        this.micBtn!.style.background = '';
      } else {
        this.speechCtrl.start();
        this.micBtn!.style.background = '#EF4444';
        showToast('Listening... Speak your question for the assistant', 'info');
      }
    });

    this.renderChips([
      'How do I use the board?',
      'How does Two-Way Communication work?',
      'How do Live Captions work?',
      'How does Emergency SOS work?',
      'Can I use ConnectPlus offline?',
      'Is my personal data stored?'
    ]);

    this.renderMessages();
  }

  private handleSend(): void {
    if (!this.inputEl || this.isGenerating) return;
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = '';
    this.sendMessage(text);
  }

  public async sendMessage(query: string): Promise<void> {
    if (this.isGenerating) return;

    this.messages.push({ role: 'user', content: query });
    this.renderMessages();

    this.isGenerating = true;
    if (this.sendBtn) this.sendBtn.disabled = true;

    // Show typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble assistant';
    typingBubble.innerHTML = `<span style="opacity: 0.7;">Thinking... 💭</span>`;
    this.messagesContainer?.appendChild(typingBubble);
    this.scrollToBottom();

    try {
      const payload: AssistantRequest = {
        message: query,
        history: this.messages.slice(-6)
      };

      const res = await fetch('/api/v1/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Assistant API error');

      const data = (await res.json()) as AssistantResponse;
      typingBubble.remove();

      // Streaming typewriter effect
      await this.streamAssistantMessage(data.answer);

      if (data.suggestions && data.suggestions.length > 0) {
        this.renderChips(data.suggestions);
      }
    } catch {
      typingBubble.remove();
      this.messages.push({
        role: 'assistant',
        content:
          "ConnectPlus provides communication assistance: use Speech-to-Text for live captions, Text-to-Speech to voice your thoughts, the Communication Board for quick tiles, and SOS for emergency contacts."
      });
      this.renderMessages();
    } finally {
      this.isGenerating = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
    }
  }

  private async streamAssistantMessage(fullText: string): Promise<void> {
    const bubbleIndex = this.messages.length;
    this.messages.push({ role: 'assistant', content: '' });
    this.renderMessages();

    const bubbles = this.messagesContainer?.querySelectorAll('.chat-bubble.assistant');
    const targetBubble = bubbles ? bubbles[bubbles.length - 1] : null;

    let displayed = '';
    const words = fullText.split(' ');

    for (let i = 0; i < words.length; i++) {
      displayed += (i > 0 ? ' ' : '') + words[i];
      this.messages[bubbleIndex].content = displayed;
      if (targetBubble) {
        targetBubble.querySelector('.bubble-text')!.textContent = displayed;
      }
      this.scrollToBottom();
      await new Promise((r) => setTimeout(r, 25));
    }
    this.renderMessages();
  }

  private renderMessages(): void {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';

    this.messages.forEach((msg) => {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.role}`;

      if (msg.role === 'assistant') {
        bubble.innerHTML = `
          <div class="bubble-text">${escapeHtml(msg.content)}</div>
          <button class="speak-reply-btn" style="background: none; border: none; padding: 4px; color: var(--bright-blue); font-size: 0.85rem; cursor: pointer; margin-top: 6px; box-shadow: none;" title="Speak answer aloud">
            🔊 Listen
          </button>
        `;
        bubble.querySelector('.speak-reply-btn')!.addEventListener('click', () => {
          tts.speak(msg.content);
        });
      } else {
        bubble.innerHTML = `<div class="bubble-text">${escapeHtml(msg.content)}</div>`;
      }

      this.messagesContainer!.appendChild(bubble);
    });

    this.scrollToBottom();
  }

  private renderChips(suggestions: string[]): void {
    if (!this.chipsContainer) return;
    this.chipsContainer.innerHTML = '';

    suggestions.forEach((text) => {
      const chip = document.createElement('button');
      chip.className = 'chat-chip-btn';
      chip.textContent = text;
      chip.onclick = () => {
        this.sendMessage(text);
      };
      this.chipsContainer!.appendChild(chip);
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
