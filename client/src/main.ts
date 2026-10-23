import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/themes.css';

import { themeCtrl } from './modules/themeController.js';
import { langCtrl } from './modules/languageController.js';
import { SpeechController } from './modules/speechController.js';
import { tts } from './modules/ttsController.js';
import { BoardController } from './modules/boardController.js';
import { LiveConversationController } from './modules/liveConversation.js';
import { TranslationController } from './modules/translationController.js';
import { SOSController } from './modules/sosController.js';
import { AssistantController } from './modules/assistantController.js';
import { unifiedAlerts } from './modules/unifiedAlerts.js';
import { ShakeDetector } from './modules/shakeDetector.js';
import { NoiseDetector } from './modules/noiseDetector.js';
import { KeyboardShortcutsManager } from './modules/keyboardShortcuts.js';
import { initPWA } from './modules/pwaInstall.js';
import { showToast } from './modules/toastController.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Language Controller (instant switching without reload)
  const langSelect = document.getElementById('globalLangSelect') as HTMLSelectElement | null;
  if (langSelect) {
    langCtrl.init(langSelect);
  }

  // 2. Theme Controller
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeCtrl.init(themeBtn);
  }

  // 3. Navigation smooth scroll and active highlighting
  initNavigation();

  // 4. Feature 1: Two-Way Communication (STT & TTS)
  const speechStatusEl = document.getElementById('speechStatus');
  const speechResultEl = document.getElementById('speechResult');
  const speechCanvasEl = document.getElementById('speechVisualizerCanvas') as HTMLCanvasElement;
  const speechLangSelect = document.getElementById('speechLangSelect') as HTMLSelectElement;

  const twoWaySpeech = new SpeechController({
    statusEl: speechStatusEl,
    outputEl: speechResultEl,
    canvasEl: speechCanvasEl,
    lang: speechLangSelect ? speechLangSelect.value : langCtrl.getSpeechCode(),
    onStateChange: (state) => {
      const badge = document.getElementById('speechMicBadge');
      if (badge) {
        badge.className = `mic-status-badge ${state}`;
        badge.textContent = state === 'listening' ? '🎙️ Listening' : state === 'error' ? '⚠️ Error' : '💤 Idle';
      }
    }
  });

  if (speechLangSelect) {
    speechLangSelect.value = langCtrl.getSpeechCode();
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
      tts.speak(ttsMessageInput.value, langCtrl.getSpeechCode(), readingHighlightContainer);
    }
  });

  stopVoiceBtn?.addEventListener('click', () => {
    tts.stop();
  });

  // 5. Feature 2: Interactive Communication Board
  const boardTilesContainer = document.getElementById('boardTilesContainer');
  const sentenceChipsContainer = document.getElementById('sentenceChipsContainer');
  const boardController = new BoardController();

  if (boardTilesContainer && sentenceChipsContainer) {
    boardController.init(boardTilesContainer, sentenceChipsContainer);
    boardController.setLanguage(langCtrl.getLanguage());

    // Category Tabs
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

    // Custom phrase modal
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

  // 6. Feature 3: Live Conversation Captions
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
      toggleLiveBtn.className = isListening ? 'btn-danger' : 'btn';
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

    const speakerSelect = document.getElementById('liveSpeakerSelect') as HTMLSelectElement;
    speakerSelect?.addEventListener('change', () => {
      liveConversation.setSpeaker(speakerSelect.value);
    });

    const joinRoomBtn = document.getElementById('joinLiveRoomBtn');
    const roomCodeInput = document.getElementById('liveRoomCodeInput') as HTMLInputElement;
    joinRoomBtn?.addEventListener('click', () => {
      if (roomCodeInput && roomCodeInput.value.trim()) {
        liveConversation.joinRoom(roomCodeInput.value.trim());
      } else {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        if (roomCodeInput) roomCodeInput.value = code;
        liveConversation.joinRoom(code);
      }
    });
  }

  // 7. Feature 4: Translation
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

  // 8. Feature 5: Unified Alerts & Sensory Settings
  const alertSettings = unifiedAlerts.getSettings();
  const alertColorSelect = document.getElementById('alertColorSelect') as HTMLSelectElement;
  const alertDurationSelect = document.getElementById('alertDurationSelect') as HTMLSelectElement;
  const alertSoundToggle = document.getElementById('alertSoundToggle') as HTMLInputElement;
  const alertVibrationToggle = document.getElementById('alertVibrationToggle') as HTMLInputElement;

  if (alertColorSelect) alertColorSelect.value = alertSettings.flashColor;
  if (alertDurationSelect) alertDurationSelect.value = alertSettings.flashDuration.toString();
  if (alertSoundToggle) alertSoundToggle.checked = alertSettings.soundEnabled;
  if (alertVibrationToggle) alertVibrationToggle.checked = alertSettings.vibrationEnabled;

  alertColorSelect?.addEventListener('change', () => {
    unifiedAlerts.saveSettings({ flashColor: alertColorSelect.value });
  });

  alertDurationSelect?.addEventListener('change', () => {
    unifiedAlerts.saveSettings({ flashDuration: parseFloat(alertDurationSelect.value) });
  });

  alertSoundToggle?.addEventListener('change', () => {
    unifiedAlerts.saveSettings({ soundEnabled: alertSoundToggle.checked });
    showToast(alertSoundToggle.checked ? 'Alert sound enabled' : 'Alert sound muted', 'info');
  });

  alertVibrationToggle?.addEventListener('change', () => {
    unifiedAlerts.saveSettings({ vibrationEnabled: alertVibrationToggle.checked });
    showToast(alertVibrationToggle.checked ? 'Alert vibration enabled' : 'Alert vibration disabled', 'info');
  });

  document.getElementById('testAlertBtn')?.addEventListener('click', () => {
    unifiedAlerts.triggerAlert({
      type: 'test',
      title: 'UNIFIED ALERT TEST',
      message: '🔔 Unified visual flash, chime tone, and vibration test successful!',
      duration: 1.2
    });
  });

  // 9. Feature 6: Sudden Shake & Loud-Noise Detection Sensors
  const shakeStatusText = document.getElementById('shakeStatusText');
  const shakeDetector = new ShakeDetector({
    statusEl: shakeStatusText,
    getAlertMessage: () => langCtrl.translate('alert_shake_banner')
  });

  const shakeToggle = document.getElementById('shakeEnableToggle') as HTMLInputElement;
  const shakeSensSelect = document.getElementById('shakeSensitivitySelect') as HTMLSelectElement;

  if (shakeToggle) {
    shakeToggle.checked = shakeDetector.getIsEnabled();
    shakeToggle.addEventListener('change', async () => {
      await shakeDetector.setEnabled(shakeToggle.checked);
      shakeToggle.checked = shakeDetector.getIsEnabled();
    });
  }

  if (shakeSensSelect) {
    shakeSensSelect.value = shakeDetector.getSensitivity();
    shakeSensSelect.addEventListener('change', () => {
      shakeDetector.setSensitivity(shakeSensSelect.value as any);
    });
  }

  document.getElementById('testShakeBtn')?.addEventListener('click', () => {
    shakeDetector.testShake();
  });

  // Sudden Loud-Noise Detector
  const noiseStatusText = document.getElementById('noiseStatusText');
  const noiseMeterFill = document.getElementById('noiseMeterFill');
  const noiseMeterVal = document.getElementById('noiseMeterVal');

  const noiseDetector = new NoiseDetector({
    statusEl: noiseStatusText,
    meterBarEl: noiseMeterFill,
    meterValueEl: noiseMeterVal,
    getAlertMessage: () => langCtrl.translate('alert_noise_banner')
  });

  const noiseToggle = document.getElementById('noiseEnableToggle') as HTMLInputElement;
  const noiseSensSelect = document.getElementById('noiseSensitivitySelect') as HTMLSelectElement;

  if (noiseToggle) {
    noiseToggle.checked = noiseDetector.getIsEnabled();
    noiseToggle.addEventListener('change', async () => {
      await noiseDetector.setEnabled(noiseToggle.checked);
      noiseToggle.checked = noiseDetector.getIsEnabled();
    });
  }

  if (noiseSensSelect) {
    noiseSensSelect.value = noiseDetector.getSensitivity();
    noiseSensSelect.addEventListener('change', () => {
      noiseDetector.setSensitivity(noiseSensSelect.value as any);
    });
  }

  document.getElementById('testNoiseBtn')?.addEventListener('click', () => {
    noiseDetector.testNoise();
  });

  // 10. Feature 7: Emergency SOS SMS Controller
  const sosUserNameInput = document.getElementById('sosUserName') as HTMLInputElement;
  const sosPhoneInput = document.getElementById('sosPhone') as HTMLInputElement;
  const sosMessageInput = document.getElementById('sosText') as HTMLTextAreaElement;
  const sosLocationConsentCheck = document.getElementById('sosLocationConsent') as HTMLInputElement;
  const sosContactsList = document.getElementById('sosContactsList');
  const sosStatusEl = document.getElementById('sosStatus');
  const sosConfirmModal = document.getElementById('sosConfirmModal');
  const sosCountdownModal = document.getElementById('sosCountdownModal');
  const sosCountdownCircle = document.getElementById('sosCountdownCircle');

  const sosCtrl = new SOSController();
  sosCtrl.init({
    userNameInput: sosUserNameInput,
    phoneInput: sosPhoneInput,
    messageInput: sosMessageInput,
    locationConsentCheck: sosLocationConsentCheck,
    contactsListEl: sosContactsList,
    statusEl: sosStatusEl,
    confirmModal: sosConfirmModal,
    countdownModal: sosCountdownModal,
    countdownCircle: sosCountdownCircle
  });

  // Track user edits on SOS message so language switcher doesn't overwrite custom message
  sosMessageInput?.addEventListener('input', () => {
    sosMessageInput.dataset.userEdited = 'true';
  });

  // Trigger SOS -> Open Confirmation Dialog
  document.getElementById('triggerSOSBtn')?.addEventListener('click', () => {
    sosCtrl.openConfirmationDialog();
  });

  // Confirmation Modal actions
  document.getElementById('confirmSendSOSBtn')?.addEventListener('click', () => {
    sosCtrl.confirmAndStartCountdown();
  });

  document.getElementById('cancelConfirmSOSBtn')?.addEventListener('click', () => {
    sosCtrl.closeConfirmationDialog();
  });

  // Countdown Modal Cancel
  document.getElementById('cancelSOSCountdownBtn')?.addEventListener('click', () => {
    sosCtrl.cancelCountdown();
  });

  // Location Consent
  sosLocationConsentCheck?.addEventListener('change', () => {
    sosCtrl.setLocationConsent(sosLocationConsentCheck.checked);
  });

  // Add Contact Modal
  const addContactModal = document.getElementById('addContactModal');
  const newContactName = document.getElementById('newContactName') as HTMLInputElement;
  const newContactPhone = document.getElementById('newContactPhone') as HTMLInputElement;
  const newContactIsPrimary = document.getElementById('newContactIsPrimary') as HTMLInputElement;

  document.getElementById('openAddContactModalBtn')?.addEventListener('click', () => {
    if (addContactModal) {
      if (newContactName) newContactName.value = '';
      if (newContactPhone) newContactPhone.value = '';
      if (newContactIsPrimary) newContactIsPrimary.checked = sosCtrl.getContacts().length === 0;
      addContactModal.style.display = 'flex';
      newContactName?.focus();
    }
  });

  document.getElementById('cancelAddContactBtn')?.addEventListener('click', () => {
    if (addContactModal) addContactModal.style.display = 'none';
  });

  document.getElementById('saveAddContactBtn')?.addEventListener('click', () => {
    const name = newContactName?.value.trim() || 'Emergency Contact';
    const phone = newContactPhone?.value.trim() || '';
    const isPrimary = newContactIsPrimary?.checked || false;

    if (!phone) {
      showToast('Please enter an emergency phone number.', 'danger');
      return;
    }

    const success = sosCtrl.addContact(name, phone, isPrimary);
    if (success && addContactModal) {
      addContactModal.style.display = 'none';
    }
  });

  // 11. Feature 8: AI Personal Assistant
  const chatMessages = document.getElementById('chatMessages');
  const chatChips = document.getElementById('chatChips');
  const chatInput = document.getElementById('chatInput') as HTMLInputElement;
  const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement;
  const chatMicBtn = document.getElementById('chatMicBtn') as HTMLButtonElement;

  const assistantCtrl = new AssistantController();
  if (chatMessages && chatChips && chatInput && chatSendBtn && chatMicBtn) {
    assistantCtrl.init(chatMessages, chatChips, chatInput, chatSendBtn, chatMicBtn);
  }

  // 12. Connect Language Controller to update modules
  langCtrl.onLanguageChange((lang, speechCode) => {
    boardController.setLanguage(lang);
    twoWaySpeech.setLanguage(speechCode);
    if (speechLangSelect) {
      speechLangSelect.value = speechCode;
    }
  });

  // 13. Keyboard Shortcuts Manager
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
      sosCtrl.openConfirmationDialog();
    }
  });

  document.getElementById('openShortcutsModalBtn')?.addEventListener('click', () => {
    shortcutsMgr.openModal();
  });
  document.getElementById('closeShortcutsBtn')?.addEventListener('click', () => {
    shortcutsMgr.closeModal();
  });

  // 14. PWA Installation & Service Worker
  initPWA();

  // 15. Initial Loading Screen smooth fadeout
  const loadingScreen = document.getElementById('appLoadingScreen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 400);
    }, 350);
  }
});

function initNavigation() {
  const menuBtn = document.getElementById('menuToggleBtn');
  const navLinks = document.getElementById('navLinks');
  menuBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('mobile-open');
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        navLinks?.classList.remove('mobile-open');
        target.scrollIntoView({ behavior: 'smooth' });

        // Update active class immediately on click
        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach((link) => {
          if (link.getAttribute('href') === href) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  });

  const sections = document.querySelectorAll('section[id]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          document.querySelectorAll('.nav-link, .mobile-nav-link').forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    },
    { threshold: 0.25 }
  );
  sections.forEach((s) => observer.observe(s));
}
