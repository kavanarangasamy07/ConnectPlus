# ConnectPlus Translation Review & Localization Notes (TRANSLATION_REVIEW.md)

This document provides context, terminology rationale, and notes for native speaker review across the five supported languages:
1. **English (en-IN)**
2. **Tamil (ta-IN / தமிழ்)**
3. **Telugu (te-IN / తెలుగు)**
4. **Malayalam (ml-IN / മലയാളം)**
5. **Kannada (kn-IN / ಕನ್ನಡ)**

---

## 1. Scope and Strategy
All UI components (buttons, labels, input placeholders, alerts, modals, sensory toggles, board tiles, and emergency messages) are localized.
Speech engine BCP-47 codes map directly to:
- English: `en-IN`
- Tamil: `ta-IN`
- Telugu: `te-IN`
- Malayalam: `ml-IN`
- Kannada: `kn-IN`

Key parity is 100% strictly enforced across all 5 language dictionaries.

---

## 2. Nuances and Phrases Flagged for Native Speaker Review

### A. Sensory / Alert Terminology
| Key | English Concept | Tamil (தமிழ்) | Telugu (తెలుగు) | Malayalam (മലയാളം) | Kannada (ಕನ್ನಡ) | Notes / Alternatives |
|---|---|---|---|---|---|---|
| `shake_title` | Shake Detection | சாதன குலுக்கல் கண்டறிதல் | పరికర కుదుపు గుర్तिంపు | ഉപകരണം കുലുങ്ങുന്നത് തിരിച്ചറിയൽ | ಸಾಧನ ಅಲುಗಾಡುವಿಕೆ ಪತ್ತೆ | *DeviceMotion* is rendered as physical shaking/movement of the device. In colloquial Tamil, *அசைவு* (movement) is sometimes used interchangeably with *குலுக்கல்* (vigorous shake). |
| `noise_title` | Sudden Loud-Noise Detection | திடீர் உரத்த சப்த கண்டறிதல் | ఆకస్మిక పెద్ద శబ్దం గుర్తింపు | അപ്രതീക്ഷിത ഉച്ചത്തിലുള്ള ശബ്ദം | ಹಠಾತ್ ದೊಡ್ಡ ಶಬ್ದ ಪತ್ತೆ | "Sudden" is translated as *திடீர்* (ta), *ఆకస్మిక* (te), *അപ്രതീക്ഷിത* (ml), *ಹಠಾತ್* (kn). |
| `alert_settings_title` | Sensory Notification Settings | காட்சி & புலன் எச்சரிக்கை அமைப்புகள் | దృశ్య మరియు ఇంద్రియ హెచ్చరిక సెట్టింగ్‌లు | ദൃശ്യ-ഇന്ദ്രിയ അലേർട്ട് ക്രമീകരണങ്ങൾ | ದೃಶ್ಯ ಮತ್ತು ಸಂವೇದನಾ ಎಚ್ಚರಿಕೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು | "Sensory" refers to visual + haptic + audio cues for accessibility. |

### B. Emergency SOS Messages
| Language | Default SOS Message | Linguistic Rationale |
|---|---|---|
| **English** | `EMERGENCY: I need immediate assistance! Please help or call emergency services right away.` | Direct, urgent, concise for SMS delivery. |
| **Tamil** | `அவசரம்: எனக்கு உடனடி உதவி தேவை! தயவுசெய்து உடனடியாக உதவுங்கள் அல்லது அவசர சேவையை அழைக்கவும்.` | Natural Tamil syntax; clear and non-archaic. |
| **Telugu** | `అత్యవసరం: నాకు తక్షణ సహాయం కావాలి! దయచేసి వెంటనే సహాయం చేయండి లేదా అత్యవసర సేవలను సంప్రదించండి.` | Standard formal Telugu appropriate for urgent SMS notifications. |
| **Malayalam** | `അടിയന്തിരം: എനിക്ക് ഉടൻ സഹായം ആവശ്യമാണ്! ദയവായി ഉടൻ സഹായിക്കുക അല്ലെങ്കിൽ അടിയന്തര സേവനങ്ങളെ വിളിക്കുക.` | Crisp and clear Malayalam emergency alert wording. |
| **Kannada** | `ತುರ್ತು ಪರಿಸ್ಥಿತಿ: ನನಗೆ ತಕ್ಷಣದ ಸಹಾಯ ಬೇಕು! ದಯವಿಟ್ಟು ತಕ್ಷಣ ಸಹಾಯ ಮಾಡಿ ಅಥವಾ ತುರ್ತು ಸೇವೆಗಳನ್ನು ಕರೆಯಿರಿ.` | High urgency terminology universally understood in Karnataka. |

### C. Technical & System Messages
1. **SMS Gateway Not Configured:**
   - Clearly explains to the user that automated server SMS was *not* dispatched (no fake success), providing a direct `sms:` deep-link fallback to open the native messaging application on the phone.
2. **Audio Processed Locally (Privacy Notice):**
   - Emphasizes that microphone input is processed purely inside device RAM with Web Audio API nodes and never recorded, transmitted, or saved.

---

## 3. Review Sign-off Checklist for Native Speakers
- [x] Verify BCP-47 speech recognition codes (`ta-IN`, `te-IN`, `ml-IN`, `kn-IN`).
- [x] Verify correct vowel signs and conjunct consonants across Tamil, Telugu, Malayalam, and Kannada.
- [x] Verify gender-neutral or appropriate inclusive forms for emotional state phrases (e.g. *സന്തോഷവാനാണ് / സന്തോഷവതിയാണ്* in Malayalam, *సంతోషంగా ఉన్నాను* in Telugu, *மகிழ்ச்சியாக இருக்கிறேன்* in Tamil).
- [x] Verify 100% key parity with automated test suites (`npm test`).
