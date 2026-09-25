// The only file that needs editing to update the site.
// Every string carries both languages: mr (Marathi) and en (English).
// A test asserts no value is left as a "TODO: " placeholder.

export const CONTENT = Object.freeze({
  // Ceremony start instant. The +05:30 offset is IST, so the countdown is
  // correct for a guest opening the site from any timezone.
  eventISO: "2026-10-24T10:00:00+05:30",

  // The Maps URLs form Google documents for opening one specific place:
  // query carries the coordinates as the human readable fallback, and
  // query_place_id pins which place is meant. Both are required together.
  // There is more than one Sanjog Lawns, so a plain name search is not safe.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=19.1370726%2C74.7215185&query_place_id=ChIJ05Bf5ymr3DsR_szczQ0fxwE",

  strings: {
    "meta.title": { mr: "अभिषेक आणि मानसी | साखरपुडा", en: "Abhishek and Mansi | Engagement" },
    "meta.description": {
      mr: "अभिषेक आणि मानसी यांचा साखरपुडा सोहळा, २४ ऑक्टोबर २०२६, संजोग लॉन्स, अहिल्यानगर.",
      en: "The engagement of Abhishek and Mansi, 24 October 2026, Sanjog Lawns, Ahilyanagar."
    },

    "nav.toggle": { mr: "English", en: "मराठी" },
    "nav.toggleLabel": { mr: "भाषा बदला", en: "Change language" },

    "hero.blessing": { mr: "॥ श्री ॥", en: "॥ Shree ॥" },
    // The Ganesh shloka that completes the invocation above it. Two keys, not
    // one string with a newline in it, because these are set with textContent
    // and a literal newline would collapse to a space.
    // The English is transliterated, never translated: a shloka is recited,
    // not read for meaning, and the dandas are carried across as the ASCII
    // pipes a reciter expects. The single danda ends the first line and the
    // double danda closes the verse, so neither is punctuation to tidy up.
    "hero.shlokaOne": {
      mr: "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।",
      en: "Vakratunda Mahakaya Suryakoti Samaprabha |"
    },
    "hero.shlokaTwo": {
      mr: "निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥",
      en: "Nirvighnam Kuru Me Deva Sarvakaryeshu Sarvada ||"
    },
    "hero.invite": {
      mr: "आमच्या आयुष्यातील या आनंदाच्या क्षणी आपण सहकुटुंब उपस्थित राहून आम्हाला आशीर्वाद द्यावेत, ही आग्रहाची विनंती.",
      en: "Please join us, with your family, for this happy moment in our lives. Your presence and your blessings would mean everything to us."
    },
    "hero.groom": { mr: "अभिषेक", en: "Abhishek" },
    "hero.and": { mr: "आणि", en: "and" },
    "hero.bride": { mr: "मानसी", en: "Mansi" },
    "hero.occasion": { mr: "साखरपुडा सोहळा", en: "Engagement Ceremony" },
    "hero.date": { mr: "शनिवार, २४ ऑक्टोबर २०२६", en: "Saturday, 24 October 2026" },
    "hero.time": { mr: "सकाळी १०:०० वाजता", en: "10:00 AM" },
    "hero.venueShort": { mr: "संजोग लॉन्स, अहिल्यानगर", en: "Sanjog Lawns, Ahilyanagar" },

    "countdown.heading": { mr: "सोहळ्यासाठी उरलेले दिवस", en: "Counting down to the day" },
    "countdown.days": { mr: "दिवस", en: "Days" },
    "countdown.hours": { mr: "तास", en: "Hours" },
    "countdown.minutes": { mr: "मिनिटे", en: "Minutes" },
    "countdown.seconds": { mr: "सेकंद", en: "Seconds" },
    "countdown.passed": {
      mr: "आमचा साखरपुडा झाला. आपल्या शुभेच्छांबद्दल मनःपूर्वक आभार.",
      en: "We are engaged. Thank you for all your blessings and wishes."
    },

    "venue.heading": { mr: "स्थळ", en: "Venue" },
    "venue.name": { mr: "संजोग लॉन्स", en: "Sanjog Lawns" },
    "venue.address": {
      mr: "संजोग लॉन्स अँड बँक्वेट, राजपालजवळ, डॉन बॉस्को परिसर, अहिल्यानगर, महाराष्ट्र ४१४००३",
      en: "Sanjog Lawns and Banquet, near Rajpal, Don Bosco Area, Ahilyanagar, Maharashtra 414003"
    },
    "venue.mapCta": { mr: "गूगल मॅपवर उघडा", en: "Open in Google Maps" },

    "footer.note": { mr: "आपल्या शुभेच्छा हाच आमचा आशीर्वाद.", en: "Your blessings are the only gift we need." }
  }
});
