import { useState, useEffect } from "react";
import QiblaCompass from "./QiblaCompass";

function MotivationCards({ summary, loading }) {
  const [quote, setQuote] = useState({ 
    arabic: "", 
    urdu: "", 
    english: "", 
    author: "" 
  });

  const quotes = [
    {
      arabic: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا",
      urdu: "بے شک نماز مومنوں پر مقررہ وقت پر فرض ہے",
      english: "Indeed, prayer has been decreed upon the believers a decree of specified times.",
      author: "Quran 4:103",
    },
    {
      arabic: "أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ",
      urdu: "اللہ کو سب سے زیادہ پسندیدہ عمل وہ ہے جو مسلسل ہو چاہے تھوڑا ہی ہو",
      english: "The most beloved deed to Allah is the most regular and constant even if it were little.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ عِمَادُ الدِّينِ",
      urdu: "نماز دین کا ستون ہے",
      english: "Prayer is the pillar of religion.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
      urdu: "صبر اور نماز کے ذریعے مدد طلب کرو",
      english: "And seek help through patience and prayer.",
      author: "Quran 2:45",
    },
    {
      arabic: "الصَّلَاةُ نُورٌ",
      urdu: "نماز روشنی ہے",
      english: "Prayer is light.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "مَنْ حَافَظَ عَلَى الصَّلَاةِ كَانَتْ لَهُ نُورًا",
      urdu: "جو نماز پر قائم رہے وہ اس کے لیے روشنی ہوگی",
      english: "Whoever maintains prayer, it will be a light for him.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ أَوَّلُ مَا يُحَاسَبُ بِهِ الْعَبْدُ",
      urdu: "نماز وہ پہلی چیز ہے جس سے بندے کا حساب لیا جائے گا",
      english: "Prayer is the first thing for which a servant will be held accountable.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ",
      urdu: "نماز قائم کرو اور زکوٰۃ ادا کرو",
      english: "And establish prayer and give zakah.",
      author: "Quran 2:43",
    },
    {
      arabic: "الصَّلَاةُ مِفْتَاحُ الْجَنَّةِ",
      urdu: "نماز جنت کی کنجی ہے",
      english: "Prayer is the key to Paradise.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "إِنَّ الصَّلَاةَ تَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنكَرِ",
      urdu: "بے شک نماز بے حیائی اور برائی سے روکتی ہے",
      english: "Indeed, prayer prohibits immorality and wrongdoing.",
      author: "Quran 29:45",
    },
    {
      arabic: "الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ",
      urdu: "نماز نیند سے بہتر ہے",
      english: "Prayer is better than sleep.",
      author: "Adhan (Call to Prayer)",
    },
    {
      arabic: "مَنْ تَرَكَ الصَّلَاةَ فَقَدْ كَفَرَ",
      urdu: "جو نماز چھوڑ دے وہ کافر ہو گیا",
      english: "Whoever abandons prayer has disbelieved.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ رُوحُ الْعِبَادَةِ",
      urdu: "نماز عبادت کی روح ہے",
      english: "Prayer is the spirit of worship.",
      author: "Islamic Teaching",
    },
    {
      arabic: "وَأَقِيمُوا الصَّلَاةَ وَاتَّقُوا اللَّهَ",
      urdu: "نماز قائم کرو اور اللہ سے ڈرو",
      english: "And establish prayer and fear Allah.",
      author: "Quran 2:238",
    },
    {
      arabic: "الصَّلَاةُ قُرْبَةٌ إِلَى اللَّهِ",
      urdu: "نماز اللہ کے قریب لانے والی ہے",
      english: "Prayer brings one closer to Allah.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "مَنْ صَلَّى الصُّبْحَ فِي جَمَاعَةٍ فَكَأَنَّمَا صَلَّى اللَّيْلَ كُلَّهُ",
      urdu: "جو فجر جماعت کے ساتھ پڑھے گویا اس نے پوری رات نماز پڑھی",
      english: "Whoever prays Fajr in congregation, it is as if he prayed the entire night.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ عِمَادُ الدِّينِ مَنْ تَرَكَهَا فَقَدْ هَدَمَ الدِّينَ",
      urdu: "نماز دین کا ستون ہے، جو اسے چھوڑے اس نے دین کو ڈھا دیا",
      english: "Prayer is the pillar of religion; whoever abandons it has destroyed religion.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ أَوَّلُ مَا فُرِضَ وَآخِرُ مَا يُرْفَعُ",
      urdu: "نماز پہلی فرض کی گئی اور آخری اٹھائی جائے گی",
      english: "Prayer was the first thing made obligatory and will be the last thing lifted.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "وَأَقِيمُوا الصَّلَاةَ وَذَكَرُوا اللَّهَ كَثِيرًا",
      urdu: "نماز قائم کرو اور اللہ کو کثرت سے یاد کرو",
      english: "And establish prayer and remember Allah often.",
      author: "Quran 33:41",
    },
    {
      arabic: "الصَّلَاةُ مِيزَانٌ",
      urdu: "نماز ترازو ہے",
      english: "Prayer is a scale.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "مَنْ حَافَظَ عَلَى الصَّلَوَاتِ الْخَمْسِ كَتَبَ اللَّهُ لَهُ جَنَّةً",
      urdu: "جو پانچ نمازوں پر قائم رہے اللہ اس کے لیے جنت لکھ دیتا ہے",
      english: "Whoever maintains the five prayers, Allah writes Paradise for him.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ نُورٌ لِلْمُؤْمِنِ",
      urdu: "نماز مومن کے لیے روشنی ہے",
      english: "Prayer is light for the believer.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "وَأَقِيمُوا الصَّلَاةَ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا",
      urdu: "نماز قائم کرو، بے شک نماز مومنوں پر مقررہ وقت پر فرض ہے",
      english: "And establish prayer. Indeed, prayer has been decreed upon the believers a decree of specified times.",
      author: "Quran 4:103",
    },
    {
      arabic: "الصَّلَاةُ خَيْرُ مَوْضُوعٍ",
      urdu: "نماز بہترین موضوع ہے",
      english: "Prayer is the best subject.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ",
      urdu: "جو دونوں ٹھنڈی نمازیں (فجر و عصر) پڑھے وہ جنت میں داخل ہوگا",
      english: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ رَاحَةٌ لِلْمُؤْمِنِ",
      urdu: "نماز مومن کے لیے آرام ہے",
      english: "Prayer is rest for the believer.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ",
      urdu: "نماز قائم کرو، زکوٰۃ ادا کرو اور رکوع کرنے والوں کے ساتھ رکوع کرو",
      english: "And establish prayer and give zakah and bow with those who bow.",
      author: "Quran 2:43",
    },
    {
      arabic: "الصَّلَاةُ عِمَادُ الدِّينِ وَرُوحُ الْعِبَادَةِ",
      urdu: "نماز دین کا ستون اور عبادت کی روح ہے",
      english: "Prayer is the pillar of religion and the spirit of worship.",
      author: "Islamic Teaching",
    },
    {
      arabic: "مَنْ صَلَّى الصُّبْحَ فِي وَقْتِهَا فَهُوَ فِي ذِمَّةِ اللَّهِ",
      urdu: "جو فجر اپنے وقت پر پڑھے وہ اللہ کی ذمہ داری میں ہے",
      english: "Whoever prays Fajr at its time is under the protection of Allah.",
      author: "Prophet Muhammad (ﷺ)",
    },
    {
      arabic: "الصَّلَاةُ أَوَّلُ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ",
      urdu: "نماز وہ پہلی چیز ہے جس سے قیامت کے دن بندے کا حساب لیا جائے گا",
      english: "Prayer is the first thing for which a servant will be held accountable on the Day of Resurrection.",
      author: "Prophet Muhammad (ﷺ)",
    },
  ];

  useEffect(() => {
    // Pick random quote on mount
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(random);
  }, []);

  // Auto-change quote every 2 minutes (120000 milliseconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    }, 120000); // 2 minutes = 120000 milliseconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Function to change quote on click
  const changeQuote = () => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  };

  if (loading || !summary) {
    return (
      <div className="motivation-grid skeleton-grid">
        <div className="motivation-card skeleton"></div>
        <div className="motivation-card skeleton"></div>
        <div className="motivation-card skeleton"></div>
      </div>
    );
  }

  const { daily } = summary;

  // Calculate stroke dashoffset for circle
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const progressOffset =
    circumference - (daily.percentage / 100) * circumference;

  return (
    <div className="motivation-grid fade-in">
      {/* Qibla Compass Card */}
      <QiblaCompass />

      {/* Daily Progress Card */}
      <div className="motivation-card progress-card">
        <div className="card-header">
          <h3>Today's Focus</h3>
          <span className="date-badge">Today</span>
        </div>
        <div className="progress-content">
          <div className="progress-ring-container">
            <svg className="progress-ring" width="80" height="80">
              <circle
                className="progress-ring-circle-bg"
                stroke="var(--surface-hover)"
                strokeWidth="6"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
              />
              <circle
                className="progress-ring-circle"
                stroke="var(--primary-color)"
                strokeWidth="6"
                fill="transparent"
                r={radius}
                cx="40"
                cy="40"
                style={{
                  strokeDasharray: `${circumference} ${circumference}`,
                  strokeDashoffset: progressOffset,
                }}
              />
            </svg>
            <div className="progress-text">
              <span className="percent">{daily.percentage}%</span>
            </div>
          </div>
          <div className="progress-details">
            <p className="big-stat">
              {daily.completed} / {daily.total}
            </p>
            <p className="sub-stat">Activities Completed</p>
          </div>
        </div>
      </div>

      {/* Quote Card */}
      <div className="motivation-card quote-card" onClick={changeQuote}>
        <div className="quote-content">
          <span className="quote-icon">❝</span>
          <div className="quote-rows">
            <p className="quote-text quote-arabic">{quote.arabic}</p>
            <p className="quote-text quote-urdu">{quote.urdu}</p>
            <p className="quote-text quote-english">{quote.english}</p>
          </div>
          <p className="quote-author">- {quote.author}</p>
        </div>
      </div>
    </div>
  );
}

export default MotivationCards;
