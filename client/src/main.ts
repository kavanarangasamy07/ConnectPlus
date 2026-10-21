import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/themes.css';

import { themeCtrl } from './modules/themeController.js';
import { SpeechController } from './modules/speechController.js';
import { tts } from './modules/ttsController.js';
import { BoardController } from './modules/boardController.js';
import { LiveConversationController } from './modules/liveConversation.js';
import { TranslationController } from './modules/translationController.js';
import { SOSController } from './modules/sosController.js';
import { AssistantController } from './modules/assistantController.js';
import { triggerVisualAlert, saveAlertSettings, loadAlertSettings } from './modules/visualAlerts.js';
import { KeyboardShortcutsManager } from './modules/keyboardShortcuts.js';
import { initPWA } from './modules/pwaInstall.js';
import { showToast } from './modules/toastController.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Controller
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeCtrl.init(themeBtn);
  }

  // 2. Navigation smooth scroll and active highlighting
  initNavigation();

  // 3. Feature 1: Two-Way Communication
  const speechStatusEl = document.getElementById('speechStatus');
  const speechResultEl = document.getElementById('speechResult');
  const speechCanvasEl = document.getElementById('speechVisualizerCanvas') as HTMLCanvasElement;
  const speechLangSelect = document.getElementById('speechLangSelect') as HTMLSelectElement;

  const twoWaySpeech = new SpeechController({
    statusEl: speechStatusEl,
    outputEl: speechResultEl,
    canvasEl: speechCanvasEl,
    lang: speechLangSelect ? speechLangSelect.value : 'en-IN',
    onStateChange: (state) => {
      const badge = document.getElementById('speechMicBadge');
      if (badge) {
        badge.className = `mic-status-badge ${state}`;
        badge.textContent = state === 'listening' ? '🎙️ Listening' : state === 'error' ? '⚠️ Error' : '💤 Idle';
      }
    }
  });

  if (speechLangSelect) {
    speechLangSelect.addEventListener('change', () => {
      twoWaySpeech.setLanguage(speechLangSelect.value);
    });
  }

  const startSpeechBtn = document.getElementById('startSpeechBtn');
  const stopSpeechBtn = document.getElementById('stopSpeechBtn');
  const clearSpeechBtn = document.getElementById('clearSpeechBtn');

  startSpeechBtn?.addEventListener('click', () => twoWaySpeech.start());
  stopSpeechBtn?.addEventListener('click', () => twoWaySpeech.stop());
  clearSpeechBtn?.addEventListener('click', () => twoWaySpeech.clearText());

  // Text to Speech
  const ttsMessageInput = document.getElementById('ttsMessageInput') as HTMLTextAreaElement;
  const speakTextBtn = document.getElementById('speakTextBtn');
  const stopVoiceBtn = document.getElementById('stopVoiceBtn');
  const ttsVoiceSelect = document.getElementById('ttsVoiceSelect') as HTMLSelectElement;
  const ttsRateSlider = document.getElementById('ttsRateSlider') as HTMLInputElement;
  const ttsPitchSlider = document.getElementById('ttsPitchSlider') as HTMLInputElement;
  const readingHighlightContainer = document.getElementById('ttsReadingHighlight');

  // Populate voices once available
  function populateVoices() {
    if (!ttsVoiceSelect) return;
    const voices = tts.getVoices();
    ttsVoiceSelect.innerHTML = voices
      .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
      .join('');
  }
  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  ttsVoiceSelect?.addEventListener('change', () => {
    tts.setVoice(ttsVoiceSelect.value);
  });

  ttsRateSlider?.addEventListener('input', () => {
    const r = parseFloat(ttsRateSlider.value);
    tts.setRate(r);
    const valEl = document.getElementById('ttsRateVal');
    if (valEl) valEl.textContent = `${r}x`;
  });

  ttsPitchSlider?.addEventListener('input', () => {
    const p = parseFloat(ttsPitchSlider.value);
    tts.setPitch(p);
    const valEl = document.getElementById('ttsPitchVal');
    if (valEl) valEl.textContent = `${p}`;
  });

  speakTextBtn?.addEventListener('click', () => {
    if (ttsMessageInput) {
      tts.speak(ttsMessageInput.value, 'en-IN', readingHighlightContainer);
    }
  });

  stopVoiceBtn?.addEventListener('click', () => {
    tts.stop();
  });

  // 4. Feature 2: Communication Board
  const boardTilesContainer = document.getElementById('boardTilesContainer');
  const sentenceChipsContainer = document.getElementById('sentenceChipsContainer');
  const boardController = new BoardController();

  if (boardTilesContainer && sentenceChipsContainer) {
    boardController.init(boardTilesContainer, sentenceChipsContainer);

    // Categories
    document.querySelectorAll('.category-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-tab-btn').forEach((b) => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        boardController.setCategory(target.getAttribute('data-cat') || 'all');
      });
    });

    // Search
    const searchInput = document.getElementById('boardSearchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      boardController.setSearch(searchInput.value);
    });

    // Sentence builder actions
    document.getElementById('speakSentenceBtn')?.addEventListener('click', () => {
      boardController.speakSentence();
    });

    document.getElementById('clearSentenceBtn')?.addEventListener('click', () => {
      boardController.clearSentence();
    });

    // Add custom phrase modal
    const addPhraseModal = document.getElementById('addPhraseModal');
    document.getElementById('openAddPhraseModalBtn')?.addEventListener('click', () => {
      if (addPhraseModal) addPhraseModal.style.display = 'flex';
    });
    document.getElementById('cancelAddPhraseBtn')?.addEventListener('click', () => {
      if (addPhraseModal) addPhraseModal.style.display = 'none';
    });
    document.getElementById('saveCustomPhraseBtn')?.addEventListener('click', () => {
      const emojiInput = (document.getElementById('customPhraseEmoji') as HTMLInputElement).value || '💬';
      const textInput = (document.getElementById('customPhraseText') as HTMLInputElement).value.trim();
      const catInput = (document.getElementById('customPhraseCategory') as HTMLSelectElement).value;

      if (!textInput) {
        showToast('Please enter a phrase text', 'danger');
        return;
      }
      boardController.addCustomPhrase(emojiInput, textInput, catInput);
      if (addPhraseModal) addPhraseModal.style.display = 'none';
      (document.getElementById('customPhraseText') as HTMLInputElement).value = '';
    });
  }

  // 5. Feature 3: Live Conversation
  const liveViewport = document.getElementById('liveCaptionsViewport');
  const liveFontSizeSlider = document.getElementById('liveFontSizeSlider') as HTMLInputElement;
  const liveFontSizeVal = document.getElementById('liveFontSizeVal');
  const liveStatusEl = document.getElementById('liveMicStatus');
  const liveRoomStatusEl = document.getElementById('liveRoomStatus');

  const liveConversation = new LiveConversationController();
  if (liveViewport && liveFontSizeSlider && liveFontSizeVal && liveStatusEl && liveRoomStatusEl) {
    liveConversation.init(liveViewport, liveFontSizeSlider, liveFontSizeVal, liveStatusEl, liveRoomStatusEl);

    const toggleLiveBtn = document.getElementById('toggleLiveListeningBtn');
    toggleLiveBtn?.addEventListener('click', () => {
      const isListening = liveConversation.toggleListening();
      toggleLiveBtn.textContent = isListening ? '⏹️ Stop Conversation' : '🎤 Start Conversation';
      toggleLiveBtn.className = isListening ? 'btn-danger' : '';
    });

    document.getElementById('pauseLiveBtn')?.addEventListener('click', (e) => {
      const isPaused = liveConversation.togglePause();
      (e.currentTarget as HTMLElement).textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
    });

    document.getElementById('copyLiveTranscriptBtn')?.addEventListener('click', () => {
      liveConversation.copyTranscript();
    });

    document.getElementById('downloadLiveTranscriptBtn')?.addEventListener('click', () => {
      liveConversation.downloadTranscript();
    });

    document.getElementById('clearLiveTranscriptBtn')?.addEventListener('click', () => {
      liveConversation.clear();
    });

    // Speaker change
    const speakerSelect = document.getElementById('liveSpeakerSelect') as HTMLSelectElement;
    speakerSelect?.addEventListener('change', () => {
      liveConversation.setSpeaker(speakerSelect.value);
    });

    // Room Code Join
    const joinRoomBtn = document.getElementById('joinLiveRoomBtn');
    const roomCodeInput = document.getElementById('liveRoomCodeInput') as HTMLInputElement;
    joinRoomBtn?.addEventListener('click', () => {
      if (roomCodeInput && roomCodeInput.value.trim()) {
        liveConversation.joinRoom(roomCodeInput.value.trim());
      } else {
        // Generate random 4-letter room code
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        if (roomCodeInput) roomCodeInput.value = code;
        liveConversation.joinRoom(code);
      }
    });
  }

  // 6. Feature 4: Translation
  const transInput = document.getElementById('translateInput') as HTMLTextAreaElement;
  const transOutput = document.getElementById('translationResult');
  const transTarget = document.getElementById('targetLanguage') as HTMLSelectElement;
  const transCharCount = document.getElementById('transCharCount');
  const transHistoryList = document.getElementById('translationHistoryList');
  const translateBtn = document.getElementById('translateBtn') as HTMLButtonElement;

  const translationCtrl = new TranslationController();
  if (transInput && transOutput && transTarget && transCharCount && transHistoryList && translateBtn) {
    translationCtrl.init(transInput, transOutput, transTarget, transCharCount, transHistoryList, translateBtn);

    translateBtn.addEventListener('click', () => translationCtrl.translate());
    document.getElementById('swapLanguageBtn')?.addEventListener('click', () => translationCtrl.swapLanguages());
    document.getElementById('speakTranslationBtn')?.addEventListener('click', () => translationCtrl.speakTranslation());
    document.getElementById('copyTranslationBtn')?.addEventListener('click', () => translationCtrl.copyTranslation());
  }

  // 7. Feature 5: Visual Notifications & Settings
  const alertSettings = loadAlertSettings();
  const alertColorSelect = document.getElementById('alertColorSelect') as HTMLSelectElement;
  const alertDurationSelect = document.getElementById('alertDurationSelect') as HTMLSelectElement;

  if (alertColorSelect) alertColorSelect.value = alertSettings.color;
  if (alertDurationSelect) alertDurationSelect.value = alertSettings.duration.toString();

  alertColorSelect?.addEventListener('change', () => {
    saveAlertSettings({ color: alertColorSelect.value });
  });

  alertDurationSelect?.addEventListener('change', () => {
    saveAlertSettings({ duration: parseFloat(alertDurationSelect.value) });
  });

  document.getElementById('testAlertBtn')?.addEventListener('click', () => {
    triggerVisualAlert('test');
  });

  // 8. Feature 6: Emergency SOS
  const sosPhoneInput = document.getElementById('sosPhone') as HTMLInputElement;
  const sosMessageInput = document.getElementById('sosText') as HTMLTextAreaElement;
  const sosContactsList = document.getElementById('sosContactsList');
  const sosStatusEl = document.getElementById('sosStatus');
  const sosCountdownModal = document.getElementById('sosCountdownModal');
  const sosCountdownCircle = document.getElementById('sosCountdownCircle');

  const sosCtrl = new SOSController();
  if (sosPhoneInput && sosMessageInput && sosContactsList && sosStatusEl && sosCountdownModal && sosCountdownCircle) {
    sosCtrl.init(sosPhoneInput, sosMessageInput, sosContactsList, sosStatusEl, sosCountdownModal, sosCountdownCircle);

    document.getElementById('triggerSOSBtn')?.addEventListener('click', () => {
      sosCtrl.triggerSOS();
    });

    document.getElementById('cancelSOSBtn')?.addEventListener('click', () => {
      sosCtrl.cancelCountdown();
    });

    const locationConsentCheck = document.getElementById('sosLocationConsent') as HTMLInputElement;
    locationConsentCheck?.addEventListener('change', () => {
      sosCtrl.setLocationConsent(locationConsentCheck.checked);
    });

    document.getElementById('addTrustedContactBtn')?.addEventListener('click', () => {
      const name = prompt('Enter trusted contact name:');
      if (!name) return;
      const phone = prompt('Enter contact WhatsApp number with country code (e.g. +91 9876543210):');
      if (phone) {
        sosCtrl.addContact(name, phone);
      }
    });
  }

  // 9. Feature 7: AI Assistant
  const chatMessages = document.getElementById('chatMessages');
  const chatChips = document.getElementById('chatChips');
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement;
  const chatMicBtn = document.getElementById('chatMicBtn') as HTMLButtonElement;

  const assistantCtrl = new AssistantController();
  if (chatMessages && chatChips && chatInput && chatSendBtn && chatMicBtn) {
    assistantCtrl.init(chatMessages, chatChips, chatInput, chatSendBtn, chatMicBtn);
  }

  // 10. Keyboard Shortcuts Manager
  const shortcutsMgr = new KeyboardShortcutsManager();
  shortcutsMgr.init({
    onToggleSTT: () => {
      if (twoWaySpeech.isListening) {
        twoWaySpeech.stop();
      } else {
        twoWaySpeech.start();
      }
    },
    onTriggerSOS: () => {
      sosCtrl.triggerSOS();
    }
  });

  document.getElementById('openShortcutsModalBtn')?.addEventListener('click', () => {
    shortcutsMgr.openModal();
  });

  // 11. PWA & Offline init
  initPWA();
});

function initNavigation() {
  // Mobile drawer toggle
  const menuBtn = document.getElementById('menuToggleBtn');
  const navLinks = document.getElementById('navLinks');
  menuBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('mobile-open');
  });

  // Smooth scroll links with null safety
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        navLinks?.classList.remove('mobile-open');
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Active section observer
  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          document.querySelectorAll('.nav-link').forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach((s) => observer.observe(s));
}
