import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

const TURKCE_MOTIVASYON_SOZLERI = [
  { soz: "Küçük adımlar, zamanla büyük zaferler doğurur.", yazar: "Konfüçyüs" },
  { soz: "Kendine inandığın an, yolun yarısını katetmişsin demektir.", yazar: "Theodore Roosevelt" },
  { soz: "Bugün, geleceğini tasarlamak için harika bir gün.", yazar: "Aura Life" },
  { soz: "İstikrar, mükemmellikten daha değerlidir.", yazar: "Aristoteles" },
  { soz: "Büyük zihinler fikirleri, ortalama zihinler olayları tartışır.", yazar: "Eleanor Roosevelt" },
  { soz: "Her yeni gün, yeni bir başlangıç için taze bir fırsattır.", yazar: "Marcus Aurelius" },
  { soz: "Zaman en değerli kaynağındır; onu neye yatırırsan o büyür.", yazar: "Seneca" },
  { soz: "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", yazar: "Robert Collier" },
  { soz: "En büyük zafer hiç düşmemek değil, her düştüğünde ayağa kalkmaktır.", yazar: "Nelson Mandela" },
  { soz: "Yarın bambaşka bir insan olacağım diyorsun. Neden bugünden başlamıyorsun?", yazar: "Epiktetos" },
  { soz: "Dünle beraber gitti düne ait ne varsa, şimdi yeni şeyler söylemek lazım.", yazar: "Mevlana" },
  { soz: "Beni durdurabilecek tek şey, kendi zihnimdeki sınırlardır.", yazar: "Mustafa Kemal Atatürk" },
  { soz: "Zafer, 'Zafer benimdir' diyebilenindir. Başarı ise 'Başaracağım' diye başlayarak sonunda 'Başardım' diyebilenindir.", yazar: "Mustafa Kemal Atatürk" },
  { soz: "Gelecek, bugün ne yaptığına bağlıdır.", yazar: "Mahatma Gandhi" },
  { soz: "Zorluklar, başarının değerini artıran süslerdir.", yazar: "Moliere" },
  { soz: "Karanlığa söveceğine bir mum da sen yak.", yazar: "Konfüçyüs" },
  { soz: "Yapabileceğimiz şeyleri yapmaya başlarsak, kendimizi hayretler içinde bırakırız.", yazar: "Thomas Edison" },
  { soz: "Hiçbir şey imkansız değildir, sadece daha fazla zaman ve emek gerektirir.", yazar: "Albert Einstein" },
  { soz: "Bilgi birikimi rüzgara benzer, eylem ise yelkendir.", yazar: "Montaigne" },
  { soz: "Yorulursan dinlenmeyi öğren, bırakmayı değil.", yazar: "Banksy" },
  { soz: "Başarısızlık, daha zekice başlama fırsatından başka bir şey değildir.", yazar: "Henry Ford" },
  { soz: "İlim ilim bilmektir, ilim kendin bilmektir.", yazar: "Yunus Emre" },
  { soz: "Kendini aşmak, dünyayı aşmaktan daha zordur.", yazar: "Nietzsche" },
  { soz: "Hedefine ulaşmak istiyorsan, engelleri değil, yolu odak noktana al.", yazar: "Sokrates" }
];

export default function AnaSayfa({ seciliModuller, setAktifSayfa }) {
  const [yaklasanEtkinlikler, setYaklasanEtkinlikler] = useState([]);
  const [birlesikGorevler, setBirlesikGorevler] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  
  const [bildirimAcik, setBildirimAcik] = useState(false);
  
  const [donguOzeti, setDonguOzeti] = useState("Veriler yükleniyor...");
  const [izlemeOzeti, setIzlemeOzeti] = useState("Kütüphane yükleniyor...");
  const [sinavOzeti, setSinavOzeti] = useState("Sınav verisi yükleniyor...");
  const [ciltOzeti, setCiltOzeti] = useState("Rutin yükleniyor...");

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [kazanilanRozetler, setKazanilanRozetler] = useState([]);

  // TÜRKÇE CANLI ALINTI STATE'LERİ
  const [gununSozuObj, setGununSozuObj] = useState(() => {
    const cached = localStorage.getItem('lifeos_gunun_sozu_tr');
    return cached ? JSON.parse(cached) : TURKCE_MOTIVASYON_SOZLERI[0];
  });

  const getLocalDateStr = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const bugunStr = getLocalDateStr(new Date());
  const bugunTarihMetni = `${new Date().getDate()} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][new Date().getMonth()]} ${new Date().getFullYear()} ${["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][new Date().getDay()]}`;
  const gunIsmi = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][new Date().getDay()];

  const getYesterday = (dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return getLocalDateStr(date);
  };

  const gunFarkiBul = (tarih1, tarih2) => {
    const d1 = new Date(tarih1);
    const d2 = new Date(tarih2);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    return Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
  };

  const calculateStreak = (tarihlerArr) => {
    if (!tarihlerArr || tarihlerArr.length === 0) return 0;
    const set = new Set(tarihlerArr);
    let current = bugunStr;
    let streak = 0;
    if (!set.has(current)) {
      current = getYesterday(current);
      if (!set.has(current)) return 0; 
    }
    while (set.has(current)) {
      streak++;
      current = getYesterday(current);
    }
    return streak;
  };

  // Rastgele Türkçe Alıntı Değiştirme
  const alintiYenile = () => {
    let yeniSoz = TURKCE_MOTIVASYON_SOZLERI[Math.floor(Math.random() * TURKCE_MOTIVASYON_SOZLERI.length)];
    if (yeniSoz.soz === gununSozuObj.soz && TURKCE_MOTIVASYON_SOZLERI.length > 1) {
      yeniSoz = TURKCE_MOTIVASYON_SOZLERI[(TURKCE_MOTIVASYON_SOZLERI.indexOf(yeniSoz) + 1) % TURKCE_MOTIVASYON_SOZLERI.length];
    }
    setGununSozuObj(yeniSoz);
    localStorage.setItem('lifeos_gunun_sozu_tr', JSON.stringify(yeniSoz));
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    const verileriTopla = async () => {
      let bugununIsleri = [];
      let toplamGorevXP = 0;
      let enYuksekSeri = 0;

      if (!userId) return;

      try {
        const snap = await getDocs(query(collection(db, 'habits'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.forEach(item => {
          const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',') : [];
          toplamGorevXP += (tarihler.length * 15);
          const seri = calculateStreak(tarihler);
          if (seri > enYuksekSeri) enYuksekSeri = seri;

          const bugunTamamlandi = tarihler.includes(bugunStr);
          bugununIsleri.push({
            id: `alisk_${item.id}`,
            tip: 'Alışkanlık',
            baslik: item.baslik,
            ikon: item.ikon || '⚡',
            tamamlandi: bugunTamamlandi,
            modul: 'duzen',
            uyariMesaji: `${item.baslik} rutini henüz tamamlanmadı!`
          });
        });
      } catch (error) { console.error("Alışkanlık çekilemedi."); }

      setXp(toplamGorevXP);
      setLevel(Math.floor(toplamGorevXP / 500) + 1);

      const kazanilanlar = [];
      if (enYuksekSeri >= 3) kazanilanlar.push({ id: 1, ikon: '🔥', ad: '3 Günlük Seri: Ateşli Başlangıç' });
      if (enYuksekSeri >= 7) kazanilanlar.push({ id: 2, ikon: '⚡', ad: '7 Günlük Seri: İstikrar Abidesi' });
      if (enYuksekSeri >= 14) kazanilanlar.push({ id: 3, ikon: '🛡️', ad: '14 Günlük Seri: Bozulmaz İrade' });
      if (enYuksekSeri >= 30) kazanilanlar.push({ id: 4, ikon: '💎', ad: '30 Günlük Seri: Efsanevi Titan' });
      setKazanilanRozetler(kazanilanlar);

      try {
        const snap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const bugunkuGorevler = data.filter(g => g.tarih === bugunStr);
        bugunkuGorevler.forEach(item => {
          bugununIsleri.push({
            id: `sinav_${item.id}`,
            tip: 'Sınav Görevi',
            baslik: item.gorev || item.text || item.baslik,
            ikon: '📝',
            tamamlandi: item.bitti || item.durum === 'bitti' || item.tamamlandi,
            modul: 'sinav',
            uyariMesaji: `Sınav görevi: ${item.gorev || item.text || item.baslik} bekliyor!`
          });
        });
        const bitenler = bugunkuGorevler.filter(g => g.bitti || g.durum === 'bitti' || g.tamamlandi).length;
        setSinavOzeti(`Bugün ${bitenler}/${bugunkuGorevler.length} görev tamamlandı.`);
      } catch (error) { setSinavOzeti("Sınav verisi hazır."); }

      try {
        const snap = await getDocs(query(collection(db, 'skincare'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const bugunkuRutinler = data.filter(u => u.gunler === 'Her Gün' || u.gunler.includes(gunIsmi));
        bugunkuRutinler.forEach(item => {
          const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',') : [];
          const bugunTamamlandi = tarihler.includes(bugunStr);
          bugununIsleri.push({
            id: `cilt_${item.id}`,
            tip: 'Cilt Bakımı',
            baslik: `${item.vakit}: ${item.urunAdi}`,
            ikon: '✦',
            tamamlandi: bugunTamamlandi,
            modul: 'cilt',
            uyariMesaji: `${item.vakit} cilt bakım adımı eksik!`
          });
        });
        const bitenler = bugunkuRutinler.filter(u => (u.tamamlananTarihler || '').includes(bugunStr)).length;
        setCiltOzeti(`Bugün ${bitenler}/${bugunkuRutinler.length} adım tamamlandı.`);
      } catch (error) { setCiltOzeti("Cilt bakımı rutinlerin burada."); }

      setBirlesikGorevler(bugununIsleri);

      const eksikler = bugununIsleri.filter(g => !g.tamamlandi);
      if (eksikler.length > 0 && !sessionStorage.getItem('lifeos_notified')) {
        if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Aura Life-OS', {
                body: `Bugün bekleyen ${eksikler.length} göreviniz var!`,
                icon: '/icon-192x192.png'
              });
              sessionStorage.setItem('lifeos_notified', 'true');
            }
          });
        }
      }

      try {
        const snap = await getDocs(query(collection(db, 'calendar'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const dinamikYaklasanlar = data
          .map(e => {
            const eTarih = new Date(e.yil, e.ay, e.gun);
            const farkGun = gunFarkiBul(eTarih, new Date());
            return { ...e, farkGun };
          })
          .filter(e => e.farkGun >= 0)
          .sort((a, b) => a.farkGun - b.farkGun)
          .slice(0, 4)
          .map(e => {
            let kalanMetni = `${e.farkGun} gün`;
            if (e.farkGun === 0) kalanMetni = 'Bugün';
            if (e.farkGun === 1) kalanMetni = 'Yarın';
            const anaRenk = e.renk.replace('bg-', '').replace('-400', '').replace('-500', '');
            return { ...e, kalanMetni, noktaRenk: `text-${anaRenk}-400`, badgeRenk: `bg-${anaRenk}-50 text-${anaRenk}-500` };
          });
        setYaklasanEtkinlikler(dinamikYaklasanlar);
      } catch (error) { console.error("Takvim API hatası."); }

      try {
        const snap = await getDocs(query(collection(db, 'cycles'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length > 0) {
          const sonKayit = [...data].sort((a, b) => new Date(b.baslangicTarihi) - new Date(a.baslangicTarihi))[0];
          const gecenGun = gunFarkiBul(new Date(), sonKayit.baslangicTarihi) + 1;
          if (sonKayit.sure === 0 || gecenGun <= sonKayit.sure) setDonguOzeti(`Reglinin ${gecenGun}. günü 🩸`);
          else setDonguOzeti(`Temizliğin ${gecenGun - sonKayit.sure}. günü ✨`);
        } else { setDonguOzeti("Döngü takibi aktif."); }
      } catch (error) { setDonguOzeti("Döngü verisi yerelde."); }

      try {
        const snap = await getDocs(query(collection(db, 'media_archive'), where('userId', '==', userId)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const izlenen = data.filter(i => i.durum === 'İzleniyor' || i.durum === 'Devam' || i.durum === 'İzlemek İstiyorum').length;
        setIzlemeOzeti(`${izlenen} içerik takip ediliyor.`);
      } catch (error) { setIzlemeOzeti("Kütüphanen hazır."); }
    };

    verileriTopla();
  }, [bugunStr, gunIsmi]);

  const filtrelenmisGorevler = birlesikGorevler.filter(g => g.baslik.toLowerCase().includes(aramaMetni.toLowerCase()));
  const eksikGorevler = birlesikGorevler.filter(g => !g.tamamlandi);
  const hedefXp = level * 500;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* 1. ÜST BAR: GLOBAL ARAMA, BİLDİRİM ZİLİ VE PROFİL */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:flex-1 relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
          <input 
            type="text" 
            placeholder="Görev, alışkanlık veya rutin ara..." 
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full bg-white/80 border border-black/5 rounded-2xl py-3.5 pl-11 pr-4 text-xs sm:text-sm focus:outline-none focus:border-blue-400 shadow-xs"
          />
        </div>
        
        <div className="flex items-center gap-3 relative self-end md:self-auto">
          <div className="relative">
            <button 
              onClick={() => setBildirimAcik(!bildirimAcik)}
              className={`w-11 h-11 rounded-full border flex items-center justify-center text-lg transition-all cursor-pointer 
                ${bildirimAcik ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white/80 border-black/5 text-gray-400 hover:bg-white'}`}
            >
              🔔
            </button>
            
            {eksikGorevler.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                {eksikGorevler.length}
              </span>
            )}

            {bildirimAcik && (
              <div className="absolute right-0 top-13 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 z-50 overflow-hidden animate-fade-in">
                <div className="bg-gray-50/80 p-3.5 border-b border-black/5 flex justify-between items-center">
                  <h4 className="font-bold text-gray-800 text-xs">Hatırlatıcılar</h4>
                  <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-md">{eksikGorevler.length} Eksik</span>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                  {eksikGorevler.length > 0 ? (
                    eksikGorevler.map((gorev, idx) => (
                      <div key={idx} className="p-3 hover:bg-gray-50 rounded-xl transition flex flex-col gap-1.5 group">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{gorev.ikon}</span>
                          <p className="text-xs font-medium text-gray-700 leading-tight">{gorev.uyariMesaji}</p>
                        </div>
                        <button 
                          onClick={() => { setAktifSayfa(gorev.modul); setBildirimAcik(false); }}
                          className="self-end text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 cursor-pointer"
                        >
                          Hemen Yap →
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <span className="text-2xl block mb-1 opacity-50">🎉</span>
                      <p className="text-xs font-light">Bugün için tüm görevlerini tamamladın!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div 
            onClick={() => setAktifSayfa('profil')} 
            className="flex items-center gap-3 bg-white/80 p-1.5 pr-4 rounded-full border border-black/5 shadow-xs cursor-pointer hover:bg-white transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              ✧
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 leading-tight">Profil</p>
              <p className="text-[10px] text-gray-500 font-medium">Seviye {level}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TÜRKÇE GÜNÜN İLHAMI KARTI */}
      <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Günün İlhamı</span>
            <span className="text-xs text-gray-400 font-light">{bugunTarihMetni}</span>
          </div>
          <p className="text-base sm:text-lg font-serif italic text-gray-800 leading-relaxed font-normal">
            "{gununSozuObj.soz}"
          </p>
          <p className="text-xs font-sans text-gray-500 font-medium text-right sm:text-left">
            — {gununSozuObj.yazar}
          </p>
        </div>

        <button 
          onClick={alintiYenile}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 self-end sm:self-auto"
          title="Farklı Bir Türkçe Söz Çek"
        >
          <span>🔄</span>
          <span>Yeni Söz</span>
        </button>
      </div>

      {/* 3. İLERLEME VE XP KARTI */}
      <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-lg font-serif text-gray-900 font-normal">İlerleme Seviyen</h3>
              <p className="text-xs text-gray-400 font-light">Sonraki seviyeye {Math.max(0, hedefXp - xp)} XP kaldı</p>
            </div>
            <span className="text-xs font-bold text-blue-600">{xp} / {hedefXp} XP</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 relative"
              style={{ width: `${Math.min(100, (xp / hedefXp) * 100)}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-black/5 pt-4 md:pt-0 md:pl-6">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Seri Rozetlerin</h4>
          <div className="flex gap-2.5">
            {kazanilanRozetler.length > 0 ? (
              kazanilanRozetler.map(rozet => (
                <div key={rozet.id} title={rozet.ad} className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shadow-xs border border-orange-100 cursor-help">
                  {rozet.ikon}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-base border border-dashed border-black/10">🔒</div>
                <p className="text-xs text-gray-400 font-light">Seri yaptıkça rozetlerin burada açılır.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 4. BUGÜNÜN ÖZETİ (TO-DO) */}
        <div className="flex-1 bg-white/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2.5rem] shadow-sm border border-black/5">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif text-gray-900 font-normal">Bugünün Özeti</h3>
              <p className="text-xs text-gray-400 font-light">{bugunTarihMetni}</p>
            </div>
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
              {filtrelenmisGorevler.filter(g => g.tamamlandi).length} / {filtrelenmisGorevler.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {filtrelenmisGorevler.length > 0 ? (
              filtrelenmisGorevler.map(gorev => (
                <div 
                  key={gorev.id} 
                  onClick={() => setAktifSayfa(gorev.modul)} 
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${gorev.tamamlandi ? 'bg-gray-50/50 border-black/5' : 'bg-white/80 border-black/5 hover:border-blue-300 hover:shadow-xs'}`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${gorev.tamamlandi ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                    {gorev.tamamlandi && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs sm:text-sm font-medium ${gorev.tamamlandi ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {gorev.ikon} {gorev.baslik}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    Git →
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <span className="text-2xl block mb-1 opacity-50">🍃</span>
                <p className="text-xs text-gray-500 font-light">Bugün için yapılması gereken görev veya alışkanlık bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* 5. YAKLAŞAN ETKİNLİKLER */}
        <div className="w-full lg:w-80 bg-white/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col">
          <h3 className="text-lg font-serif text-gray-900 font-normal mb-0.5">Takvim</h3>
          <p className="text-xs text-gray-400 font-light mb-5">Yaklaşan Etkinlikler</p>
          
          <div className="flex flex-col gap-3 flex-1">
            {yaklasanEtkinlikler.length > 0 ? (
              yaklasanEtkinlikler.map(etkinlik => (
                <div key={etkinlik.id} onClick={() => setAktifSayfa('takvim')} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-gray-50/80 transition cursor-pointer border border-transparent hover:border-black/5">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs ${etkinlik.noktaRenk || 'text-blue-400'}`}>●</span> 
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{etkinlik.baslik}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{etkinlik.gun} {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][etkinlik.ay]}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold shadow-xs ${etkinlik.badgeRenk || 'bg-blue-50 text-blue-500'}`}>
                    {etkinlik.kalanMetni}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center opacity-60">
                <span className="text-2xl mb-1">📅</span>
                <p className="text-xs text-gray-500 text-center font-light">Yakın zamanda etkinlik görünmüyor.</p>
              </div>
            )}
          </div>
          
          <button onClick={() => setAktifSayfa('takvim')} className="w-full mt-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition cursor-pointer">
            Takvime Git
          </button>
        </div>
      </div>

      {/* 6. MODÜL KISAYOLLARI */}
      <h3 className="text-base sm:text-lg font-serif text-gray-900 font-normal ml-1">Tüm Modüller</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {seciliModuller.duzen && (
          <div onClick={() => setAktifSayfa('duzen')} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xs border border-black/5 hover:border-orange-300 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 text-base mb-2 group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Alışkanlıklar</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-light">Seriler ve Hedefler</p>
          </div>
        )}
        {seciliModuller.sinav && (
          <div onClick={() => setAktifSayfa('sinav')} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xs border border-black/5 hover:border-blue-300 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 text-base mb-2 group-hover:scale-110 transition-transform">🎓</div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Sınav Takibi</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-light">{sinavOzeti}</p>
          </div>
        )}
        {seciliModuller.cilt && (
          <div onClick={() => setAktifSayfa('cilt')} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xs border border-black/5 hover:border-red-300 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-gray-800 text-base mb-2 group-hover:scale-110 transition-transform">✦</div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Cilt Bakımı</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-light">{ciltOzeti}</p>
          </div>
        )}
        {seciliModuller.dongu && (
          <div onClick={() => setAktifSayfa('dongu')} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xs border border-black/5 hover:border-pink-300 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-[#FCF5F8] flex items-center justify-center text-[#D0709B] text-base mb-2 group-hover:scale-110 transition-transform">🩸</div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">Döngü Takibi</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-light">{donguOzeti}</p>
          </div>
        )}
        {seciliModuller.izleme && (
          <div onClick={() => setAktifSayfa('izleme')} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xs border border-black/5 hover:border-purple-300 transition-all cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 text-base mb-2 group-hover:scale-110 transition-transform">🎬</div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800">İzleme Arşivi</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-light">{izlemeOzeti}</p>
          </div>
        )}
      </div>
    </div>
  );
}