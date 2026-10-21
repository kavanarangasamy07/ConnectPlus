// Common accessibility phrases fallback dictionary for maximum offline/resilience reliability
const FALLBACK_DICTIONARY = {
    'hello': {
        ta: 'வணக்கம்',
        hi: 'नमस्ते',
        fr: 'Bonjour',
        es: 'Hola',
        te: 'నమస్కారం',
        kn: 'ನಮಸ್ಕಾರ',
        ml: 'നമസ്കാരം',
        bn: 'হ্যালো / নমস্কার',
        ar: 'مرحبا',
        de: 'Hallo'
    },
    'help': {
        ta: 'உதவி',
        hi: 'मदद',
        fr: 'Aide',
        es: 'Ayuda',
        te: 'సహాయం',
        kn: 'ಸಹಾಯ',
        ml: 'സഹായം',
        bn: 'সাহায্য',
        ar: 'مساعدة',
        de: 'Hilfe'
    },
    'please help me': {
        ta: 'தயவுசெய்து எனக்கு உதவுங்கள்.',
        hi: 'कृपया मेरी मदद करें।',
        fr: "S'il vous plaît aidez-moi.",
        es: 'Por favor ayúdame.',
        te: 'దయచేసి నాకు సహాయం చేయండి.',
        kn: 'ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ.',
        ml: 'ദയവായി എന്നെ സഹായിക്കൂ.',
        bn: 'দয়া করে আমাকে সাহায্য করুন।',
        ar: 'من فضلك ساعدني.',
        de: 'Bitte helfen Sie mir.'
    },
    'i need water': {
        ta: 'எனக்கு தண்ணீர் வேண்டும்.',
        hi: 'मुझे पानी चाहिए।',
        fr: "J'ai besoin d'eau.",
        es: 'Necesito agua.',
        te: 'నాకు నీరు కావాలి.',
        kn: 'ನನಗೆ ನೀರು ಬೇಕು.',
        ml: 'എനിക്ക് വെള്ളം വേണം.',
        bn: 'আমার জল দরকার।',
        ar: 'أحتاج إلى ماء.',
        de: 'Ich brauche Wasser.'
    },
    'i need a doctor': {
        ta: 'எனக்கு மருத்துவர் தேவை.',
        hi: 'मुझे डॉक्टर की जरूरत है।',
        fr: "J'ai besoin d'un médecin.",
        es: 'Necesito un médico.',
        te: 'నాకు డాక్టర్ కావాలి.',
        kn: 'ನನಗೆ ವೈದ್ಯರು ಬೇಕು.',
        ml: 'എനിക്ക് ഒരു ഡോക്ടറെ വേണം.',
        bn: 'আমার একজন ডাক্তার দরকার।',
        ar: 'أحتاج إلى طبيب.',
        de: 'Ich brauche einen Arzt.'
    },
    'thank you': {
        ta: 'நன்றி',
        hi: 'धन्यवाद',
        fr: 'Merci',
        es: 'Gracias',
        te: 'ధన్యవాదాలు',
        kn: 'ಧನ್ಯವಾದಗಳು',
        ml: 'നന്ദി',
        bn: 'ধন্যবাদ',
        ar: 'شكرا لك',
        de: 'Danke'
    }
};
export class MyMemoryProvider {
    name = 'MyMemory';
    async translate(text, source, target) {
        const cleanText = text.trim();
        const src = source === 'auto' || !source ? 'en' : source;
        // Check emergency offline dictionary first
        const norm = cleanText.toLowerCase();
        if (FALLBACK_DICTIONARY[norm]?.[target]) {
            return FALLBACK_DICTIONARY[norm][target];
        }
        const langpair = `${src}|${target}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(langpair)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'ConnectPlus-Accessibility/1.0' }
            });
            clearTimeout(timeout);
            if (!res.ok) {
                throw new Error(`MyMemory HTTP ${res.status}`);
            }
            const data = (await res.json());
            if (data && data.responseData && typeof data.responseData.translatedText === 'string') {
                const translated = data.responseData.translatedText;
                // Check if MyMemory returned an error message in translatedText
                if (!translated.startsWith('MYMEMORY WARNING')) {
                    return translated;
                }
            }
            throw new Error(data?.responseDetails || 'MyMemory translation empty');
        }
        catch (err) {
            clearTimeout(timeout);
            // Fallback if network/rate limit failed
            if (FALLBACK_DICTIONARY[norm]?.[target]) {
                return FALLBACK_DICTIONARY[norm][target];
            }
            throw new Error(`Translation provider error: ${err.message || 'unknown'}`);
        }
    }
}
export function getTranslationProvider() {
    // If DEEPL_API_KEY or GOOGLE_TRANSLATE_API_KEY were set in env, we could return those adapters
    return new MyMemoryProvider();
}
