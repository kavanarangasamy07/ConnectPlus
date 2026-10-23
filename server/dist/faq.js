export const FAQ_DATABASE = [
    {
        id: 'intro',
        keywords: ['hello', 'hi', 'hey', 'start', 'begin', 'welcome', 'who are you', 'what is this', 'about'],
        patterns: [/\b(hello|hi|hey|greetings|welcome|what is connectplus|who are you)\b/i],
        question: 'What is ConnectPlus and how does it empower communication?',
        answer: 'ConnectPlus is an advanced, privacy-first accessibility platform designed for deaf, hard-of-hearing, mute, and speech-impaired individuals. It features Two-Way Speech & Text, an Interactive Communication Board, Live Captions with cross-device room codes, Multilingual Translation in 5 Indian languages (English, Tamil, Telugu, Malayalam, Kannada), Sudden Shake & Loud Noise Detection, Unified Sensory Alerts, and secure Emergency SOS SMS.',
        suggestions: ['How do I use the Communication Board?', 'How does Sudden Shake & Noise Detection work?', 'How does Emergency SOS work?', 'Can I use ConnectPlus offline?']
    },
    {
        id: 'board-usage',
        keywords: ['board', 'communication board', 'emoji', 'phrase', 'speak tile', 'tile', 'custom phrase', 'sentence', 'builder', 'offline board'],
        patterns: [/\b(board|tile|phrases?|sentence|builder)\b/i],
        question: 'How do I use the Interactive Communication Board?',
        answer: 'The Communication Board lets you communicate instantly without speaking: 1) Tap any categorized tile (Basic, Health, Food & Water, Emotions, Emergency, Custom) to voice it aloud. 2) Tap multiple tiles to build coherent sentences in the Sentence Builder Bar, then tap "Speak Sentence". 3) Long-press or click favorite to pin frequently used phrases. 4) Tap "+ Add Custom Phrase" to save personalized phrases that persist on your device and work completely offline.',
        suggestions: ['How to add custom phrases?', 'Can I use the board in Tamil or Telugu?', 'How do I clear the sentence builder?']
    },
    {
        id: 'speech-tools',
        keywords: ['speech', 'voice', 'microphone', 'mic', 'stt', 'tts', 'listen', 'hear', 'talk', 'sound wave', 'speed', 'pitch'],
        patterns: [/\b(speech|microphone|mic|voice|listen|tts|stt|visualizer|pitch|speed)\b/i],
        question: 'How does Two-Way Communication (STT & TTS) work?',
        answer: 'Two-Way Communication bridges conversations seamlessly: 1) Speech-to-Text listens to the other person speaking, converts words into live text, and visualizes speech energy with a real-time sound-wave canvas. 2) Text-to-Speech allows you to type your thoughts or pick phrases, select from available system voices, customize speed (0.5x to 2x) and pitch, and follow along with word-by-word visual reading highlights.',
        suggestions: ['Which speech languages are supported?', 'Why did the microphone stop?', 'Can I change the voice accent?']
    },
    {
        id: 'shake-detection',
        keywords: ['shake', 'shaking', 'devicemotion', 'motion', 'fall', 'distress', 'shake sensor', 'sensitivity', 'cooldown'],
        patterns: [/\b(shake|shaking|motion|movement|fall)\b/i],
        question: 'How does Sudden Shake Detection work?',
        answer: 'Shake Detection uses the DeviceMotion API to detect vigorous or sudden shaking of your smartphone or tablet—useful if you drop the phone, experience sudden distress, or need urgent attention. You can adjust the sensitivity (Low, Medium, High), test it with the "Test Shake Alert" button, and toggle it on or off. Note: For safety, shaking NEVER automatically triggers SOS; instead, it activates your unified visual flash, alert chime, and vibration.',
        suggestions: ['Does shake detection send an SOS automatically?', 'How do I test the shake alert?', 'What if my phone does not support motion sensors?']
    },
    {
        id: 'noise-detection',
        keywords: ['noise', 'sound', 'loud', 'decibel', 'alarm', 'siren', 'horn', 'bark', 'cry', 'web audio', 'meter'],
        patterns: [/\b(noise|loud|sound level|audio sensor|meter|alarm|siren)\b/i],
        question: 'How does Sudden Loud-Noise Detection work?',
        answer: 'Loud-Noise Detection monitors ambient sound via the Web Audio API to alert deaf and hard-of-hearing users to sudden loud events (like alarms, shouting, car horns, or sirens). It features an animated live sound-level meter, adjustable sensitivity thresholds (65 dB to 85 dB), and cooldown protection. Privacy Guarantee: All audio is processed purely in temporary memory inside your browser—no audio is ever recorded, stored, or sent over the internet.',
        suggestions: ['Is my audio recorded or uploaded?', 'How do I adjust noise sensitivity?', 'Can I test the loud noise alert?']
    },
    {
        id: 'unified-alerts',
        keywords: ['alert', 'alerts', 'flash', 'vibration', 'chime', 'sound', 'sensory', 'settings', 'color', 'duration'],
        patterns: [/\b(alert|flash|vibrat|chime|sensory|perimeter)\b/i],
        question: 'What is the Unified Alerts system and how do I configure it?',
        answer: 'The Unified Alert system delivers accessible sensory alerts when speech is detected, a shake occurs, a loud noise is heard, or an SOS is triggered: 1) Glowing perimeter flash around the screen with selectable colors (Cyan, Amber, Green, Pink, Red) and duration. 2) Web Audio alert chime with independent on/off toggle. 3) Haptic vibration on supported devices with separate on/off toggle. 4) Large, high-contrast translated warning banners that respect your selected language.',
        suggestions: ['How to change alert flash color?', 'Can I turn off sound alerts and keep vibration only?', 'How to test unified alerts?']
    },
    {
        id: 'emergency-sos',
        keywords: ['sos', 'emergency', 'sms', 'gateway', 'trusted contact', 'primary', 'gps', 'location', 'whatsapp', 'cancel', 'duplicate'],
        patterns: [/\b(sos|emergency|sms|contact|primary contact|gateway|twilio)\b/i],
        question: 'How does Emergency SOS SMS dispatch work?',
        answer: 'Emergency SOS is engineered for reliability, safety, and privacy: 1) Save trusted emergency contacts with phone validation and designate a Primary Contact. Phone numbers are stored securely with client-side obfuscation. 2) Tapping SOS opens a confirmation dialog showing the recipient, your name (if provided), message preview, and GPS location status. 3) When confirmed, the secure backend dispatches an SMS via an SMS Gateway (such as Twilio). 4) If no gateway is configured on the server, the app clearly explains that no automated SMS was sent and provides a direct "sms:" link and WhatsApp button with the pre-filled emergency text and Google Maps link.',
        suggestions: ['What happens if no SMS gateway is configured?', 'How to set a primary emergency contact?', 'How to cancel an SOS in progress?']
    },
    {
        id: 'languages-localization',
        keywords: ['language', 'languages', 'tamil', 'telugu', 'malayalam', 'kannada', 'english', 'script', 'native', 'switch'],
        patterns: [/\b(languag|tamil|telugu|malayalam|kannada|translation|script)\b/i],
        question: 'Which languages are supported and how do I switch?',
        answer: 'ConnectPlus natively supports 5 Indian languages: English (en-IN), Tamil (ta-IN / தமிழ்), Telugu (te-IN / తెలుగు), Malayalam (ml-IN / മലയാളം), and Kannada (kn-IN / ಕನ್ನಡ). Switching languages from the header dropdown updates all buttons, labels, alerts, communication board tiles, and default SOS messages instantly without reloading the page. Speech recognition and text-to-speech automatically adapt to your chosen language.',
        suggestions: ['Does switching language reload the page?', 'Are board tiles translated too?', 'How do I translate arbitrary text?']
    },
    {
        id: 'live-conversation',
        keywords: ['live', 'conversation', 'captions', 'subtitles', 'room', 'share', 'font size', 'transcript', 'download'],
        patterns: [/\b(live|caption|subtitle|transcript|room|share)\b/i],
        question: 'How do Live Captions and Room Sharing work?',
        answer: 'Live Captions transcribe conversations with speaker labels, timestamps, and an adjustable font size slider (16px to 64px) for optimal reading comfort. You can pause the feed, copy text, download transcripts as a .txt file, or generate a 4-letter Room Code to broadcast live captions to friends or colleagues in real time over WebSockets.',
        suggestions: ['How to share a live caption room code?', 'Can I adjust font size for captions?', 'How to download the transcript?']
    },
    {
        id: 'privacy-offline',
        keywords: ['privacy', 'offline', 'pwa', 'install', 'cache', 'data', 'safe', 'secure', 'encrypted'],
        patterns: [/\b(priva(cy|te)|offline|pwa|install|cache|security|data)\b/i],
        question: 'Is ConnectPlus secure and can it be used offline?',
        answer: 'Yes! ConnectPlus follows rigorous Privacy by Design: 1) Microphone audio is processed entirely on your device and never uploaded. 2) Emergency contacts and phone numbers are encrypted/obfuscated before saving and never stored in plain text. 3) ConnectPlus is a Progressive Web App (PWA) with a Service Worker: you can install it on your device and use the Communication Board, TTS, Shake Sensor, Noise Meter, and SOS drafting completely offline.',
        suggestions: ['How do I install ConnectPlus on my phone?', 'What works offline?', 'Where are my emergency contacts stored?']
    },
    {
        id: 'keyboard-accessibility',
        keywords: ['keyboard', 'shortcuts', 'accessibility', 'a11y', 'screen reader', 'contrast', 'wcag', 'high contrast'],
        patterns: [/\b(keyboard|shortcut|screen reader|accessibility|contrast|wcag|help)\b/i],
        question: 'What accessibility features and keyboard shortcuts are built in?',
        answer: 'ConnectPlus complies with WCAG 2.2 AA standards: large touch targets (44px+), visible focus rings, ARIA live announcements, screen reader labels, reduced-motion compatibility, and high-contrast themes. Keyboard shortcuts include: Alt+M (Toggle Speech-to-Text), Alt+B (Jump to Board), Alt+L (Jump to Live Captions), Alt+T (Cycle Theme: Light/Dark/High Contrast), Alt+S (Emergency SOS), ? (Open Shortcuts Help), and Esc (Close modal).',
        suggestions: ['How to toggle High Contrast theme?', 'Show all keyboard shortcuts', 'Does it support screen readers?']
    }
];
export function matchFAQ(query) {
    if (!query || query.trim().length === 0)
        return null;
    const normalized = query.toLowerCase().trim();
    const words = normalized.split(/\W+/).filter((w) => w.length > 2);
    let bestMatch = null;
    let highestScore = 0;
    for (const item of FAQ_DATABASE) {
        let score = 0;
        // Pattern regex matching
        for (const pattern of item.patterns) {
            if (pattern.test(normalized)) {
                score += 5;
            }
        }
        // Keyword matching
        for (const kw of item.keywords) {
            if (normalized.includes(kw)) {
                score += 3;
            }
        }
        // Individual word overlap
        for (const word of words) {
            if (item.keywords.some((kw) => kw.includes(word))) {
                score += 1.5;
            }
            if (item.question.toLowerCase().includes(word)) {
                score += 1;
            }
        }
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    }
    if (bestMatch && highestScore >= 2) {
        const confidence = Math.min(1.0, Number((highestScore / 8).toFixed(2)));
        return { item: bestMatch, confidence };
    }
    return null;
}
