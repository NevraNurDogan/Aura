import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

  const [namazKalanSure, setNamazKalanSure] = useState(null);
  const [siradakiVakitAdi, setSiradakiVakitAdi] = useState(null);

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
    let interval = null;
    
    const vakitleriCek = () => {
      if (interval) {
        clearInterval(interval);
      }
      const maneviyatSehir = localStorage.getItem('maneviyat_sehir') || 'Konya';
      const apiSehir = maneviyatSehir.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, 'i').replace(/İ/g, 'I');
      
      fetch(`https://api.aladhan.com/v1/timingsByCity?city=${apiSehir}&country=Turkey&method=13`)
        .then(res => res.json())
        .then(data => {
          if (data && data.data && data.data.timings) {
            const t = data.data.timings;
            const vakitler = [
              { ad: 'Sabah', saat: t.Fajr },
              { ad: 'Öğle', saat: t.Dhuhr },
              { ad: 'İkindi', saat: t.Asr },
              { ad: 'Akşam', saat: t.Maghrib },
              { ad: 'Yatsı', saat: t.Isha }
            ];
            
            interval = setInterval(() => {
              const now = new Date();
              const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
              
              let siradaki = null;
              let fark = 0;
              
              for (let v of vakitler) {
                const [h, m] = v.saat.split(':').map(Number);
                const vSec = h * 3600 + m * 60;
                if (vSec > currentSeconds) {
                  siradaki = v.ad;
                  fark = vSec - currentSeconds;
                  break;
                }
              }
              
              if (!siradaki) {
                siradaki = 'Sabah';
                const [h, m] = vakitler[0].saat.split(':').map(Number);
                fark = ((h + 24) * 3600 + m * 60) - currentSeconds;
              }
              
              const hours = Math.floor(fark / 3600);
              const minutes = Math.floor((fark % 3600) / 60);
              const seconds = fark % 60;
              
              setNamazKalanSure(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
              setSiradakiVakitAdi(siradaki);
            }, 1000);
          }
        })
        .catch(console.error);
    };

    vakitleriCek();
    window.addEventListener('sehirDegisti', vakitleriCek);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('sehirDegisti', vakitleriCek);
    };
  }, []);

  useEffect(() => {
    const userId = getCurrentUserId();
    const verileriTopla = async () => {
      let bugununIsleri = [];
      let toplamGorevXP = 0;
      let enYuksekSeri = 0;

      if (!userId) return;

      const promiseGunluk = seciliModuller.gunluk ? getDocs(query(collection(db, 'habits'), where('userId', '==', userId))) : Promise.resolve(null);
      const promiseSinav = seciliModuller.sinav ? getDocs(query(collection(db, 'tasks'), where('userId', '==', userId))) : Promise.resolve(null);
      const promiseCilt = seciliModuller.cilt ? getDocs(query(collection(db, 'skincare'), where('userId', '==', userId))) : Promise.resolve(null);
      const promiseTakvim = getDocs(query(collection(db, 'calendar'), where('userId', '==', userId)));
      const promiseDongu = seciliModuller.dongu ? getDocs(query(collection(db, 'cycles'), where('userId', '==', userId))) : Promise.resolve(null);
      const promiseIzleme = seciliModuller.izleme ? getDocs(query(collection(db, 'media_archive'), where('userId', '==', userId))) : Promise.resolve(null);

      const [resGunluk, resSinav, resCilt, resTakvim, resDongu, resIzleme] = await Promise.allSettled([
        promiseGunluk, promiseSinav, promiseCilt, promiseTakvim, promiseDongu, promiseIzleme
      ]);

      if (resGunluk.status === 'fulfilled' && resGunluk.value) {
        const data = resGunluk.value.docs.map(d => ({ id: d.id, ...d.data() }));
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
            modul: 'gunluk',
            uyariMesaji: `${item.baslik} rutini henüz tamamlanmadı!`
          });
        });
      } else if (resGunluk.status === 'rejected' && seciliModuller.gunluk) {
        console.error("Alışkanlık çekilemedi.");
      }

      setXp(toplamGorevXP);
      setLevel(Math.floor(toplamGorevXP / 500) + 1);

      const kazanilanlar = [];
      if (enYuksekSeri >= 3) kazanilanlar.push({ id: 1, ikon: '🔥', ad: '3 Günlük Seri: Ateşli Başlangıç' });
      if (enYuksekSeri >= 7) kazanilanlar.push({ id: 2, ikon: '⚡', ad: '7 Günlük Seri: İstikrar Abidesi' });
      if (enYuksekSeri >= 14) kazanilanlar.push({ id: 3, ikon: '🛡️', ad: '14 Günlük Seri: Bozulmaz İrade' });
      if (enYuksekSeri >= 30) kazanilanlar.push({ id: 4, ikon: '💎', ad: '30 Günlük Seri: Efsanevi Titan' });
      setKazanilanRozetler(kazanilanlar);

      if (resSinav.status === 'fulfilled' && resSinav.value) {
        const data = resSinav.value.docs.map(d => ({ id: d.id, ...d.data() }));
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
      } else if (resSinav.status === 'rejected' && seciliModuller.sinav) {
        setSinavOzeti("Sınav verisi hazır.");
      }

      if (resCilt.status === 'fulfilled' && resCilt.value) {
        const data = resCilt.value.docs.map(d => ({ id: d.id, ...d.data() }));
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
      } else if (resCilt.status === 'rejected' && seciliModuller.cilt) {
        setCiltOzeti("Cilt bakımı rutinlerin burada.");
      }

      setBirlesikGorevler(bugununIsleri);

      const eksikler = bugununIsleri.filter(g => !g.tamamlandi);
      if (eksikler.length > 0 && !sessionStorage.getItem('lifeos_notified')) {
        setTimeout(async () => {
          if (Capacitor.isNativePlatform()) {
            let perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
              perm = await LocalNotifications.requestPermissions();
            }
            if (perm.display === 'granted') {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    title: 'Aura: Bekleyen Görevler',
                    body: `Bugün tamamlaman gereken ${eksikler.length} görevin var. İlk eksik: ${eksikler[0].baslik}`,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 1000) },
                    actionTypeId: '',
                    extra: null
                  }
                ]
              });
              sessionStorage.setItem('lifeos_notified', 'true');
            }
          } else {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Aura: Bekleyen Görevler', {
                body: `Bugün tamamlaman gereken ${eksikler.length} görevin var. İlk eksik: ${eksikler[0].baslik}`,
                icon: '/icons/icon-192x192.png'
              });
              sessionStorage.setItem('lifeos_notified', 'true');
            } else if ('Notification' in window && Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification('Aura: Bekleyen Görevler', {
                    body: `Bugün tamamlaman gereken ${eksikler.length} görevin var. İlk eksik: ${eksikler[0].baslik}`,
                    icon: '/icons/icon-192x192.png'
                  });
                  sessionStorage.setItem('lifeos_notified', 'true');
                }
              });
            }
          }
        }, 3000);
      }

      if (resTakvim.status === 'fulfilled' && resTakvim.value) {
        const data = resTakvim.value.docs.map(d => ({ id: d.id, ...d.data() }));
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
      } else if (resTakvim.status === 'rejected') {
        console.error("Takvim API hatası.");
      }

      if (resDongu.status === 'fulfilled' && resDongu.value) {
        const data = resDongu.value.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length > 0) {
          const sonKayit = [...data].sort((a, b) => new Date(b.baslangicTarihi) - new Date(a.baslangicTarihi))[0];
          const gecenGun = gunFarkiBul(new Date(), sonKayit.baslangicTarihi) + 1;
          if (sonKayit.sure === 0 || gecenGun <= sonKayit.sure) setDonguOzeti(`Reglinin ${gecenGun}. günü 🩸`);
          else setDonguOzeti(`Temizliğin ${gecenGun - sonKayit.sure}. günü ✨`);
        } else { setDonguOzeti("Döngü takibi aktif."); }
      } else if (resDongu.status === 'rejected' && seciliModuller.dongu) {
        setDonguOzeti("Döngü verisi yerelde.");
      }

      if (resIzleme.status === 'fulfilled' && resIzleme.value) {
        const data = resIzleme.value.docs.map(d => ({ id: d.id, ...d.data() }));
        const izlenen = data.filter(i => 
          (i.durum || '').includes('İstiyorum') || 
          (i.durum || '').includes('Devam') || 
          (i.durum || '').includes('Okuyorum')
        ).length;
        setIzlemeOzeti(`${izlenen} içerik takip ediliyor.`);
      } else if (resIzleme.status === 'rejected' && seciliModuller.izleme) {
        setIzlemeOzeti("Kütüphanen hazır.");
      }
    };

    verileriTopla();
  }, [bugunStr, gunIsmi]);

  const toggleGorevDurumu = async (gorev, e) => {
    e.stopPropagation(); // Butona tıklayınca sayfaya gitmesini engelle
    const [tur, id] = gorev.id.split('_');
    const yeniDurum = !gorev.tamamlandi;
    
    // Anında arayüzde güncelle
    setBirlesikGorevler(prev => prev.map(g => g.id === gorev.id ? { ...g, tamamlandi: yeniDurum } : g));

    try {
      if (tur === 'alisk') {
        const docRef = doc(db, 'habits', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const item = docSnap.data();
          const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',').filter(Boolean) : [];
          const yeniTarihler = yeniDurum 
            ? [...tarihler, bugunStr] 
            : tarihler.filter(t => t !== bugunStr);
          await updateDoc(docRef, { tamamlananTarihler: yeniTarihler.join(',') });
        }
      } else if (tur === 'sinav') {
        const docRef = doc(db, 'tasks', id);
        await updateDoc(docRef, { bitti: yeniDurum, tamamlandi: yeniDurum });
      } else if (tur === 'cilt') {
        const docRef = doc(db, 'skincare', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const item = docSnap.data();
          const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',').filter(Boolean) : [];
          const yeniTarihler = yeniDurum 
            ? [...tarihler, bugunStr] 
            : tarihler.filter(t => t !== bugunStr);
          await updateDoc(docRef, { tamamlananTarihler: yeniTarihler.join(',') });
        }
      }
    } catch (error) {
      console.error("Görev güncellenirken hata oluştu:", error);
      // Hata olursa geri al
      setBirlesikGorevler(prev => prev.map(g => g.id === gorev.id ? { ...g, tamamlandi: !yeniDurum } : g));
    }
  };

  const filtrelenmisGorevler = birlesikGorevler.filter(g => g.baslik.toLowerCase().includes(aramaMetni.toLowerCase()));
  const eksikGorevler = birlesikGorevler.filter(g => !g.tamamlandi);
  const hedefXp = level * 500;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* 1. ÜST BAR: GLOBAL ARAMA VE BİLDİRİM ZİLİ */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex-1 relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
          <input 
            type="text" 
            placeholder="Görev, alışkanlık veya rutin ara..." 
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            className="w-full bg-white/80 border border-black/5 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-xs sm:text-sm focus:outline-none focus:border-blue-400 shadow-xs"
          />
        </div>
        
        <div className="relative shrink-0">
          <button 
            onClick={() => setBildirimAcik(!bildirimAcik)}
            className={`w-[52px] h-[52px] rounded-[1.25rem] border flex items-center justify-center text-xl transition-all cursor-pointer 
              ${bildirimAcik ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white/80 border-black/5 text-gray-400 hover:bg-white shadow-xs'}`}
          >
            🔔
          </button>
          
          {eksikGorevler.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-sm">
              {eksikGorevler.length}
            </span>
          )}

          {bildirimAcik && (
            <div className="absolute right-0 top-14 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 z-50 overflow-hidden animate-fade-in">
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


      {/* OYUNLAŞTIRMA (SANAL AĞAÇ) & NAMAZ VAKTİ KARTLARI YAN YANA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* YENİ: SANAL AĞAÇ & XP KARTI */}
        <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col justify-between relative overflow-hidden group">
          {/* Ağaç arka plan efekti */}
          <div className="absolute -right-10 -bottom-10 text-[10rem] opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            {xp < 500 ? '🌰' : xp < 1500 ? '🌱' : xp < 3000 ? '🌿' : xp < 6000 ? '🌳' : '🌲'}
          </div>

          <div className="relative z-10 flex gap-4 items-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-4xl shadow-inner shrink-0">
              {xp < 500 ? '🌰' : xp < 1500 ? '🌱' : xp < 3000 ? '🌿' : xp < 6000 ? '🌳' : '🌲'}
            </div>
            <div>
              <h3 className="text-lg font-serif text-gray-900 font-normal">Sanal Fidanın</h3>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">
                {xp < 500 ? 'Henüz toprakta bir tohum. Görev yaptıkça büyüyecek!' : 
                 xp < 1500 ? 'Filizlenmeye başladı! Düzenli çalışman meyve veriyor.' : 
                 xp < 3000 ? 'Kökleri güçlendi. Artık daha istikrarlısın.' : 
                 xp < 6000 ? 'Gölgesinde dinlenilecek devasa bir ağaca dönüştü.' : 
                 'Artık sarsılmaz bir iradeye ve düzene sahip bir ulu ağaçsın!'}
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SEVİYE {level}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{xp} / {hedefXp} XP</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5 mb-4 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-1000 relative"
                style={{ width: `${Math.min(100, (xp / hedefXp) * 100)}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/5 relative z-10">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
              <span>Rozet Koleksiyonu</span>
              {kazanilanRozetler.length > 0 && <span className="text-emerald-500">{kazanilanRozetler.length} Rozet</span>}
            </h4>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {kazanilanRozetler.length > 0 ? (
                kazanilanRozetler.map(rozet => (
                  <div key={rozet.id} title={rozet.ad} className="w-9 h-9 shrink-0 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shadow-sm border border-orange-100 cursor-help hover:scale-110 transition-transform">
                    {rozet.ikon}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 opacity-60 bg-gray-50 p-2 rounded-xl border border-dashed border-black/10 w-full">
                  <div className="w-6 h-6 flex items-center justify-center text-gray-400 text-xs">🔒</div>
                  <p className="text-[10px] text-gray-400 font-light">Seri yaptıkça rozetler açılır.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAMAZ VAKTİ SAYACI KARTI (Koyu mod fixli) */}
        {seciliModuller.maneviyat && (
          <div onClick={() => setAktifSayfa('maneviyat')} className="bg-indigo-50 backdrop-blur-xl p-5 sm:p-6 rounded-[2.5rem] shadow-sm border border-indigo-100 flex flex-col justify-center items-center cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-7xl opacity-5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">🕌</div>
            
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-1 relative z-10 text-center">
              {siradakiVakitAdi ? `${siradakiVakitAdi} Vaktine Kalan Süre` : 'Vakit Hesaplanıyor...'}
            </h3>
            
            <div className="text-4xl sm:text-5xl font-mono font-bold text-gray-800 my-2 tracking-tighter relative z-10">
              {namazKalanSure || '--:--:--'}
            </div>
            
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-2 bg-white/60 px-3 py-1.5 rounded-xl border border-indigo-100 relative z-10 transition-colors group-hover:bg-white/80">
              Maneviyat Modülüne Git →
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* BUGÜNÜN ÖZETİ (TO-DO) */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Hızlı Ajanda Kartı */}
          <div onClick={() => setAktifSayfa('ajanda')} className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 sm:p-8 rounded-[2.5rem] shadow-sm text-white flex justify-between items-center relative overflow-hidden group cursor-pointer transition-shadow hover:shadow-md">
            <div className="absolute -right-8 -top-8 text-8xl opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">▤</div>
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-serif font-normal mb-1">Bugünün Ajandası</h3>
              <p className="text-xs sm:text-sm font-medium text-indigo-100">
                {eksikGorevler.length > 0 
                  ? `Tamamlanmayı bekleyen ${eksikGorevler.length} göreviniz var.` 
                  : 'Harika! Bugün için tüm görevlerini tamamladın.'}
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-md relative z-10 group-hover:bg-white/30 transition-colors shrink-0">
              ➔
            </div>
          </div>

          {/* Modül Durum Kartları Grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {seciliModuller.dongu && (
              <div onClick={() => setAktifSayfa('dongu')} className="bg-pink-50 p-4 sm:p-5 rounded-3xl border border-pink-100 cursor-pointer hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-pink-500 shadow-xs">○</span>
                  <span className="text-[11px] font-bold text-pink-600 uppercase tracking-wider">Döngü</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{donguOzeti}</p>
              </div>
            )}

            {seciliModuller.izleme && (
              <div onClick={() => setAktifSayfa('izleme')} className="bg-blue-50 p-4 sm:p-5 rounded-3xl border border-blue-100 cursor-pointer hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-xs">◈</span>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">İzleme</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{izlemeOzeti}</p>
              </div>
            )}

            {seciliModuller.cilt && (
              <div onClick={() => setAktifSayfa('cilt')} className="bg-rose-50 p-4 sm:p-5 rounded-3xl border border-rose-100 cursor-pointer hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-xs">✦</span>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Cilt Bakımı</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{ciltOzeti}</p>
              </div>
            )}

            {seciliModuller.sinav && (
              <div onClick={() => setAktifSayfa('sinav')} className="bg-amber-50 p-4 sm:p-5 rounded-3xl border border-amber-100 cursor-pointer hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-xs">◎</span>
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Sınav</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{sinavOzeti}</p>
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


    </div>
  );
}