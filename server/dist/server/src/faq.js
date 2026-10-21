export const FAQ_DATABASE = [
    {
        id: 'intro',
        keywords: ['hello', 'hi', 'hey', 'start', 'begin', 'welcome', 'who are you', 'what is this'],
        patterns: [/\b(hello|hi|hey|greetings|welcome)\b/i],
        question: 'What is ConnectPlus and how does it help?',
        answer: 'ConnectPlus is an AI-powered accessibility platform designed for deaf, hard-of-hearing, mute, and speech-impaired individuals. It provides real-time Two-Way Speech & Text, an interactive Communication Board, Live Captions, Multilingual Translation, Visual Flash Alerts, and one-tap Emergency SOS.',
        suggestions: ['How do I use the board?', 'Can I use this offline?', 'How does SOS work?']
    },
    {
        id: 'board-usage',
        keywords: ['board', 'communication board', 'emoji', 'phrase', 'speak tile', 'tile', 'custom phrase', 'sentence', 'builder'],
        patterns: [/\b(board|tile|phrases?|sentence)\b/i],
        question: 'How do I use the Communication Board?',
        answer: 'Select any category (Basic, Health, Food, Emotions, Emergency, Custom) and tap a tile to speak it aloud. You can tap multiple tiles to chain them in the Sentence Builder Bar, long-press a tile to favorite it, drag to reorder, or add custom phrases that sync automatically.',
        suggestions: ['How to add custom phrases?', 'Can I reorder tiles?', 'How do I clear the sentence builder?']
    },
    {
        id: 'speech-tools',
        keywords: ['speech', 'voice', 'microphone', 'mic', 'stt', 'tts', 'listen', 'hear', 'talk', 'sound wave'],
        patterns: [/\b(speech|microphone|mic|voice|listen|tts|stt|visualizer)\b/i],
        question: 'How does Two-Way Communication work?',
        answer: 'Speech-to-Text converts what other people say into live text with an animated sound-wave visualizer and auto-restart resilience. Text-to-Speech allows you to type any message or pick ready tiles, choose voices, adjust rate & pitch, and follow highlighted words in real time.',
        suggestions: ['Which languages are supported?', 'Can I adjust voice speed?', 'Why did the mic stop?']
    },
    {
        id: 'live-conversation',
        keywords: ['live', 'conversation', 'captions', 'subtitles', 'room', 'share', 'font size', 'transcript'],
        patterns: [/\b(live|caption|subtitle|transcript|room|share)\b/i],
        question: 'How do Live Captions work?',
        answer: 'Live Captions transcribe ongoing conversations with speaker labels, timestamps, and an adjustable font size (16px to 64px) for comfortable reading. You can pause, copy, download transcripts as .txt, or generate a 4-digit Room Code to share live captions across devices via WebSockets.',
        suggestions: ['How to share live room?', 'Can I change caption font size?', 'How to download transcripts?']
    },
    {
        id: 'translation',
        keywords: ['translate', 'translation', 'language', 'tamil', 'hindi', 'french', 'spanish', 'telugu', 'kannada', 'malayalam', 'bengali', 'arabic', 'german'],
        patterns: [/\b(translat|language|multilingual)\b/i],
        question: 'Which languages can I translate between?',
        answer: 'ConnectPlus supports 10 languages: Tamil (தமிழ்), Hindi (हिन्दी), French (Français), Spanish (Español), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Arabic (العربية), and German (Deutsch). We auto-detect source text, provide a 500-character limit counter, instant swap, audio playback in the target tongue, and an offline request queue.',
        suggestions: ['Can I speak translated text?', 'Does translation work offline?', 'How to swap languages?']
    },
    {
        id: 'emergency-sos',
        keywords: ['sos', 'emergency', 'help', 'danger', 'whatsapp', 'sms', 'location', 'gps', 'trusted contact'],
        patterns: [/\b(sos|emergency|doctor|police|danger|urgent)\b/i],
        question: 'How does the Emergency SOS system work?',
        answer: 'Pressing the Emergency SOS button triggers a safety-conscious 3-second countdown (with cancel option). Upon confirmation, it sends customized emergency messages to up to 3 trusted contacts via WhatsApp or SMS, optionally attaching a precise Google Maps geolocation link with your explicit consent.',
        suggestions: ['Is my phone number stored?', 'How to add trusted contacts?', 'What if I have no internet for SOS?']
    },
    {
        id: 'privacy-data',
        keywords: ['privacy', 'data', 'stored', 'safe', 'secure', 'consent', 'tracking', 'server'],
        patterns: [/\b(priva(cy|te)|security|store(d)?|data|track(ing)?)\b/i],
        question: 'Is my personal data or voice stored?',
        answer: 'Your privacy is paramount. ConnectPlus adheres to Privacy by Design: your voice is processed entirely in the browser using the Web Speech API and is never recorded or uploaded. Phone numbers are kept solely on your device and never stored in plain text on servers. Custom phrases use anonymous local device IDs without tracking.',
        suggestions: ['How to clear my saved data?', 'What is anonymous device ID?', 'Is ConnectPlus free?']
    },
    {
        id: 'offline-pwa',
        keywords: ['offline', 'internet', 'install', 'pwa', 'app', 'download', 'cache'],
        patterns: [/\b(offline|install|pwa|internet|cache)\b/i],
        question: 'Can ConnectPlus be used offline or installed as an app?',
        answer: 'Yes! ConnectPlus is a progressive web app (PWA). You can click "Install App" in the navigation bar to install it on your Android, iOS, Windows, or Mac device. The Communication Board, Text-to-Speech, Visual Alerts, and SOS drafting work fully offline.',
        suggestions: ['How to install on phone?', 'Does speech work offline?', 'How does offline queueing work?']
    },
    {
        id: 'visual-alerts',
        keywords: ['visual', 'notification', 'flash', 'vibration', 'alert', 'light', 'vibrate'],
        patterns: [/\b(visual|alert|flash|vibrat|notification)\b/i],
        question: 'What are Visual Notifications and how do they help?',
        answer: 'Visual Notifications provide sensory cues for deaf and hard-of-hearing users by flashing the screen perimeter with glowing borders, displaying prominent toast banners, and triggering haptic vibration. You can configure flash color, intensity, and duration in the settings panel.',
        suggestions: ['How to test visual alert?', 'Can I change flash color?', 'Does vibration work on PC?']
    },
    {
        id: 'keyboard-accessibility',
        keywords: ['keyboard', 'shortcuts', 'accessibility', 'a11y', 'screen reader', 'contrast', 'wcag'],
        patterns: [/\b(keyboard|shortcut|screen reader|accessibility|contrast|wcag)\b/i],
        question: 'What accessibility features and keyboard shortcuts are available?',
        answer: 'ConnectPlus meets WCAG 2.2 AA standards with 44px+ touch targets, skip links, ARIA live announcements, high-contrast themes, and keyboard shortcuts: Alt+M (toggle Speech-to-Text), Alt+B (jump to Board), Alt+L (Live Captions), Alt+T (cycle Themes), Alt+S (Emergency SOS), and ? (open Shortcuts modal).',
        suggestions: ['Show all keyboard shortcuts', 'How to toggle High Contrast?', 'How do screen readers work with ConnectPlus?']
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
                score += 4;
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
