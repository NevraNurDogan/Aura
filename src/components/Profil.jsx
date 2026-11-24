import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, getCurrentUserId } from '../firebase';

export default function Profil() {
  const varsayilanIsim = auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Kullanıcı');

  const [profil, setProfil] = useState({
    id: 1,
    isim: localStorage.getItem('lifeos_profil_isim') || varsayilanIsim,
    avatarUrl: localStorage.getItem('lifeos_profil_avatar') || '',
    xp: parseInt(localStorage.getItem('lifeos_profil_xp') || '0'),
    level: parseInt(localStorage.getItem('lifeos_profil_level') || '1'),
    kazanilanRozetler: localStorage.getItem('lifeos_profil_rozetler') || ''
  });

  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [yeniIsim, setYeniIsim] = useState(profil.isim);
  const [yeniAvatar, setYeniAvatar] = useState(profil.avatarUrl);

  const [haftalikVeri, setHaftalikVeri] = useState([]);
  const [enerjiVerisi, setEnerjiVerisi] = useState([]);
  const [isiHaritasiVerisi, setIsiHaritasiVerisi] = useState([]);
  
  const [ozetModalAcik, setOzetModalAcik] = useState(false);

  useEffect(() => {
    if (!ozetModalAcik) return undefined;

    const oncekiTasima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oncekiTasima;
    };
  }, [ozetModalAcik]);

  const tumRozetler = [
    // Alışkanlık Serileri
    { id: '1', ikon: '🔥', ad: 'Ateşli Başlangıç', detay: '3 Gün Alışkanlık Serisi', tier: 'Bronz' },
    { id: '2', ikon: '⚡', ad: 'İstikrar Abidesi', detay: '7 Gün Alışkanlık Serisi', tier: 'Gümüş' },
    { id: '3', ikon: '🛡️', ad: 'Bozulmaz İrade', detay: '14 Gün Alışkanlık Serisi', tier: 'Altın' },
    { id: '4', ikon: '💎', ad: 'Efsanevi Titan', detay: '30 Gün Alışkanlık Serisi', tier: 'Elmas' },
    { id: '5', ikon: '🌋', ad: 'Durdurulamaz', detay: '60 Gün Alışkanlık Serisi', tier: 'Efsanevi' },
    
    // Görev/Sınav
    { id: '6', ikon: '📚', ad: 'Görev Çırağı', detay: '5 Sınav Görevi Bitti', tier: 'Bronz' },
    { id: '7', ikon: '🎯', ad: 'Odak Ustası', detay: '20 Sınav Görevi Bitti', tier: 'Gümüş' },
    { id: '8', ikon: '🧠', ad: 'Profesör', detay: '50 Sınav Görevi Bitti', tier: 'Altın' },
    { id: '9', ikon: '🏆', ad: 'Mükemmeliyetçi', detay: '100 Sınav Görevi Bitti', tier: 'Elmas' },
    
    // Cilt Bakımı
    { id: '10', ikon: '✨', ad: 'Parlak Başlangıç', detay: '5 Cilt Bakımı', tier: 'Bronz' },
    { id: '11', ikon: '🧴', ad: 'Güzellik Rutini', detay: '15 Cilt Bakımı', tier: 'Gümüş' },
    { id: '12', ikon: '🧖‍♀️', ad: 'Glow Up', detay: '30 Cilt Bakımı', tier: 'Altın' },
    { id: '13', ikon: '🌟', ad: 'Kusursuz Cilt', detay: '100 Cilt Bakımı', tier: 'Elmas' },
    
    // İzleme/Okuma Arşivi
    { id: '14', ikon: '🍿', ad: 'Seyirci', detay: '3 Kitap/Film Bitti', tier: 'Bronz' },
    { id: '15', ikon: '🎬', ad: 'Kültür Mantarı', detay: '10 Yapım Bitti', tier: 'Gümüş' },
    { id: '16', ikon: '📖', ad: 'Kitap Kurdu', detay: '25 Yapım Bitti', tier: 'Altın' },
    { id: '17', ikon: '🎭', ad: 'Sanat Eleştirmeni', detay: '50 Yapım Bitti', tier: 'Elmas' },
    
    // Maneviyat / Döngü
    { id: '18', ikon: '🤲', ad: 'Huzur', detay: '5 Maneviyat Notu', tier: 'Bronz' },
    { id: '19', ikon: '🕊️', ad: 'Sakin Zihin', detay: '20 Maneviyat Notu', tier: 'Altın' },
    { id: '20', ikon: '🌸', ad: 'Kendini Bilen', detay: '3 Regl Döngüsü', tier: 'Gümüş' },
    { id: '21', ikon: '🌺', ad: 'Doğa Ana', detay: '10 Regl Döngüsü', tier: 'Altın' },
    
    // Seviye Başarımları
    { id: '22', ikon: '🌱', ad: 'İlk Adım', detay: 'Seviye 2\'ye Ulaşıldı', tier: 'Bronz' },
    { id: '23', ikon: '⭐', ad: 'Yükselen Yıldız', detay: 'Seviye 5\'e Ulaşıldı', tier: 'Gümüş' },
    { id: '24', ikon: '🎖️', ad: 'Kıdemli Maceracı', detay: 'Seviye 10\'a Ulaşıldı', tier: 'Altın' },
    { id: '25', ikon: '👑', ad: 'Şampiyon', detay: 'Seviye 20\'ye Ulaşıldı', tier: 'Elmas' },
    { id: '26', ikon: '🌌', ad: 'Kozmik Varlık', detay: 'Seviye 50\'ye Ulaşıldı', tier: 'Efsanevi' },
    
    // XP
    { id: '27', ikon: '🪙', ad: 'XP Avcısı', detay: '1,000 XP', tier: 'Gümüş' },
    { id: '28', ikon: '💰', ad: 'Zenginlik', detay: '5,000 XP', tier: 'Altın' },
    { id: '29', ikon: '🐉', ad: 'Ejderha Hazinesi', detay: '10,000 XP', tier: 'Elmas' },
    { id: '30', ikon: '🔮', ad: 'Aura Tanrısı', detay: '50,000 XP', tier: 'Efsanevi' }
  ];

  const getLocalDateStr = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const bugunStr = getLocalDateStr(new Date());

  const getYesterday = (dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return getLocalDateStr(date);
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

  const konfetiPatlat = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#A8E6CF', '#800020', '#8B4513', '#3b82f6', '#f59e0b'] 
    });
  };

  const userId = getCurrentUserId();

  const verileriGetirVeHesapla = async () => {
    let profilData = null;
    let aliskanlikData = [];
    let gorevData = [];
    let ciltData = [];
    let izlemeData = [];
    let donguData = [];
    let maneviyatNotlari = JSON.parse(localStorage.getItem('maneviyat_tefekkur_notlari')) || [];

    try {
      const [snapProfil, snapAliskanlik, snapGorev, snapCilt, snapIzleme, snapDongu] = await Promise.all([
        getDoc(doc(db, 'profiles', userId)),
        getDocs(query(collection(db, 'habits'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'skincare'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'media_archive'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'cycles'), where('userId', '==', userId)))
      ]);

      if (snapProfil.exists()) profilData = snapProfil.data();
      aliskanlikData = snapAliskanlik.docs.map(d => d.data());
      gorevData = snapGorev.docs.map(d => d.data());
      ciltData = snapCilt.docs.map(d => d.data());
      izlemeData = snapIzleme.docs.map(d => d.data());
      donguData = snapDongu.docs.map(d => d.data());
    } catch (e) {
      console.warn("Firebase profil verileri çekilemedi...");
    }

    if (!profilData) {
      profilData = {
        isim: localStorage.getItem('lifeos_profil_isim') || varsayilanIsim,
        avatarUrl: localStorage.getItem('lifeos_profil_avatar') || '',
        xp: parseInt(localStorage.getItem('lifeos_profil_xp') || '0'),
        level: parseInt(localStorage.getItem('lifeos_profil_level') || '1'),
        kazanilanRozetler: localStorage.getItem('lifeos_profil_rozetler') || '',
        email: auth.currentUser?.email || ''
      };
    }

    // GRAFİK VERİLERİ HESAPLAMA
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return getLocalDateStr(d);
    });
    const gunIsimleri = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const gercekHaftalikVeri = last7Days.map(dateStr => {
      const dObj = new Date(dateStr);
      const name = gunIsimleri[dObj.getDay()];
      const aliskanlikCount = aliskanlikData.filter(a => (a.tamamlananTarihler || '').includes(dateStr)).length;
      const gorevCount = gorevData.filter(g => g.tarih === dateStr && g.bitti).length;
      return { gun: name, gorev: gorevCount, aliskanlik: aliskanlikCount };
    });
    setHaftalikVeri(gercekHaftalikVeri);

    const gercekEnerjiVerisi = [];
    for (let w = 3; w >= 0; w--) {
      let haftalikPuan = 0;
      for (let d = 0; d < 7; d++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - (w * 7 + d));
        const pStr = getLocalDateStr(pastDate);
        haftalikPuan += aliskanlikData.filter(a => (a.tamamlananTarihler || '').includes(pStr)).length;
        haftalikPuan += gorevData.filter(g => g.tarih === pStr && g.bitti).length;
      }
      gercekEnerjiVerisi.push({ gun: `${4-w}. Hafta`, enerji: (haftalikPuan || 2) * 5 });
    }
    setEnerjiVerisi(gercekEnerjiVerisi);

    // ISI HARİTASI (Son 140 Gün / 20 Hafta)
    const gercekIsiHaritasi = [];
    for (let d = 139; d >= 0; d--) {
      const gDate = new Date();
      gDate.setDate(gDate.getDate() - d);
      const str = getLocalDateStr(gDate);
      
      const aCount = aliskanlikData.filter(a => (a.tamamlananTarihler || '').includes(str)).length;
      const gCount = gorevData.filter(g => g.tarih === str && g.bitti).length;
      gercekIsiHaritasi.push({ tarih: str, count: aCount + gCount });
    }
    setIsiHaritasiVerisi(gercekIsiHaritasi);

    // KAPSAMLI HASSAS XP VE ROZET HESAPLAMA MOTORU
    let enYuksekSeri = 0;
    let toplamXP = 0;

    // 1. Alışkanlıklar XP (+15 XP)
    aliskanlikData.forEach(item => {
      const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',') : [];
      toplamXP += (tarihler.length * 15);
      const seri = calculateStreak(tarihler);
      if (seri > enYuksekSeri) enYuksekSeri = seri;
    });

    // 2. Sınav Görevleri XP (+15 XP)
    const toplamBitenGorev = gorevData.filter(g => g.bitti).length;
    toplamXP += (toplamBitenGorev * 15);

    // 3. Cilt Bakımı XP (+10 XP)
    let toplamCiltAdimi = 0;
    ciltData.forEach(item => {
      const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',') : [];
      toplamCiltAdimi += tarihler.length;
    });
    toplamXP += (toplamCiltAdimi * 10);

    // 4. İzleme/Okuma Arşivi XP (+25 XP)
    const toplamBitenIcerik = izlemeData.filter(i => (i.durum || '').includes('Bitti') || (i.durum || '').includes('Okudum')).length;
    toplamXP += (toplamBitenIcerik * 25);

    // 5. Maneviyat Notları (+5 XP)
    const toplamManeviyat = maneviyatNotlari.length;
    toplamXP += (toplamManeviyat * 5);

    // 6. Döngü Kaydı (+20 XP)
    const toplamDongu = donguData.length;
    toplamXP += (toplamDongu * 20);

    // Seviye Hesabı: Her 500 XP = 1 Seviye
    const hakedilenLevel = Math.floor(toplamXP / 500) + 1;

    // ROZET KAZANMA KOŞULLARI
    const hakEdilenRozetler = [];
    if (enYuksekSeri >= 3) hakEdilenRozetler.push('1');
    if (enYuksekSeri >= 7) hakEdilenRozetler.push('2');
    if (enYuksekSeri >= 14) hakEdilenRozetler.push('3');
    if (enYuksekSeri >= 30) hakEdilenRozetler.push('4');
    if (enYuksekSeri >= 60) hakEdilenRozetler.push('5');
    
    if (toplamBitenGorev >= 5) hakEdilenRozetler.push('6');
    if (toplamBitenGorev >= 20) hakEdilenRozetler.push('7');
    if (toplamBitenGorev >= 50) hakEdilenRozetler.push('8');
    if (toplamBitenGorev >= 100) hakEdilenRozetler.push('9');
    
    if (toplamCiltAdimi >= 5) hakEdilenRozetler.push('10');
    if (toplamCiltAdimi >= 15) hakEdilenRozetler.push('11');
    if (toplamCiltAdimi >= 30) hakEdilenRozetler.push('12');
    if (toplamCiltAdimi >= 100) hakEdilenRozetler.push('13');
    
    if (toplamBitenIcerik >= 3) hakEdilenRozetler.push('14');
    if (toplamBitenIcerik >= 10) hakEdilenRozetler.push('15');
    if (toplamBitenIcerik >= 25) hakEdilenRozetler.push('16');
    if (toplamBitenIcerik >= 50) hakEdilenRozetler.push('17');
    
    if (toplamManeviyat >= 5) hakEdilenRozetler.push('18');
    if (toplamManeviyat >= 20) hakEdilenRozetler.push('19');
    if (toplamDongu >= 3) hakEdilenRozetler.push('20');
    if (toplamDongu >= 10) hakEdilenRozetler.push('21');
    
    if (hakedilenLevel >= 2) hakEdilenRozetler.push('22');
    if (hakedilenLevel >= 5) hakEdilenRozetler.push('23');
    if (hakedilenLevel >= 10) hakEdilenRozetler.push('24');
    if (hakedilenLevel >= 20) hakEdilenRozetler.push('25');
    if (hakedilenLevel >= 50) hakEdilenRozetler.push('26');
    
    if (toplamXP >= 1000) hakEdilenRozetler.push('27');
    if (toplamXP >= 5000) hakEdilenRozetler.push('28');
    if (toplamXP >= 10000) hakEdilenRozetler.push('29');
    if (toplamXP >= 50000) hakEdilenRozetler.push('30');

    const hakEdilenRozetStr = hakEdilenRozetler.join(',');

    const eskiRozetSayisi = profilData.kazanilanRozetler ? profilData.kazanilanRozetler.split(',').filter(x => x).length : 0;
    if (hakEdilenRozetler.length > eskiRozetSayisi) {
      konfetiPatlat();
    }

    profilData.xp = toplamXP;
    profilData.level = hakedilenLevel;
    profilData.kazanilanRozetler = hakEdilenRozetStr;

    setProfil(profilData);
    setYeniIsim(profilData.isim);
    setYeniAvatar(profilData.avatarUrl);

    localStorage.setItem('lifeos_profil_isim', profilData.isim);
    localStorage.setItem('lifeos_profil_avatar', profilData.avatarUrl);
    localStorage.setItem('lifeos_profil_xp', profilData.xp.toString());
    localStorage.setItem('lifeos_profil_level', profilData.level.toString());
    localStorage.setItem('lifeos_profil_rozetler', profilData.kazanilanRozetler || '');
    window.dispatchEvent(new Event('profilGuncellendi'));

    try {
      await setDoc(doc(db, 'profiles', userId), profilData, { merge: true });
    } catch (e) { console.warn("Profil Firebase'e kaydedilemedi."); }
  };

  useEffect(() => {
    verileriGetirVeHesapla();
  }, []);

  const handleGorselYukle = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setYeniAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const profiliGuncelle = async () => {
    const payload = { ...profil, isim: yeniIsim, avatarUrl: yeniAvatar };
    setProfil(payload);
    setDuzenlemeModu(false);

    localStorage.setItem('lifeos_profil_isim', yeniIsim);
    localStorage.setItem('lifeos_profil_avatar', yeniAvatar);

    window.dispatchEvent(new Event('profilGuncellendi'));

    try {
      await setDoc(doc(db, 'profiles', userId), payload, { merge: true });
    } catch (error) {
      console.warn("Profil Firebase'e güncellenemedi.");
    }
  };

  const seviyeBasiXp = 500;
  const mevcutLevelIlerleme = profil.xp % seviyeBasiXp;
  const sahipOlunanRozetler = profil.kazanilanRozetler ? profil.kazanilanRozetler.split(',') : [];

  const xpTablosu = [
    { islem: 'İzlenen Film/Dizi Kaydı', xp: '+25', renk: 'text-purple-600', bg: 'bg-purple-50' },
    { islem: 'Yeni Regl Döngüsü', xp: '+20', renk: 'text-pink-600', bg: 'bg-pink-50' },
    { islem: 'Sınav Görevi Bitirme', xp: '+15', renk: 'text-blue-600', bg: 'bg-blue-50' },
    { islem: 'Alışkanlık Tamamlama', xp: '+15', renk: 'text-emerald-600', bg: 'bg-emerald-50' },
    { islem: 'Cilt Bakım Rutini', xp: '+10', renk: 'text-amber-600', bg: 'bg-amber-50' },
    { islem: 'Şükür/Tefekkür Notu', xp: '+5',  renk: 'text-teal-600', bg: 'bg-teal-50' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      
      {/* ÜST PROFİL KARTI */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative group">
          {profil.avatarUrl ? (
            <img src={profil.avatarUrl} alt="Profil" className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-md z-10 relative bg-gray-50" />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center text-3xl sm:text-4xl font-bold border-4 border-white shadow-md z-10 relative">
              {profil.isim.charAt(0).toUpperCase()}
            </div>
          )}
          <button onClick={() => setDuzenlemeModu(!duzenlemeModu)} className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-xs border border-black/5 text-gray-600 hover:text-blue-600 transition z-20 cursor-pointer">
            ✏️
          </button>
        </div>

        <div className="flex-1 w-full text-center md:text-left z-10">
          {!duzenlemeModu ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-serif text-gray-900 font-bold mb-1">{profil.isim}</h2>
              <p className="text-xs sm:text-sm font-medium text-blue-600 mb-4">Seviye {profil.level} • Maceracı ({profil.xp} Toplam XP)</p>
            </>
          ) : (
            <div className="flex flex-col gap-3 mb-4 max-w-sm mx-auto md:mx-0">
              <input 
                type="text" 
                value={yeniIsim} 
                onChange={e => setYeniIsim(e.target.value)} 
                placeholder="İsminiz..." 
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-400 bg-gray-50" 
              />
              
              <label className="relative block w-full cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGorselYukle}
                  className="hidden"
                  aria-label="Profil fotoğrafı seç"
                />
                <span className="flex w-full items-center justify-center gap-1.5 p-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 bg-gray-50 text-center hover:bg-gray-100 transition">
                  {yeniAvatar && yeniAvatar.length > 100 ? '📸 Görsel Seçildi' : '📁 Fotoğraf Seç'}
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => setDuzenlemeModu(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer">İptal</button>
                <button onClick={profiliGuncelle} className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer">Kaydet</button>
              </div>
            </div>
          )}

          {/* XP BARI */}
          <div className="w-full max-w-md mx-auto md:mx-0">
            <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
              <span>Seviye {profil.level} İlerlemesi</span>
              <span className="text-blue-600">{mevcutLevelIlerleme} / {seviyeBasiXp} XP</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 relative"
                style={{ width: `${Math.min(100, (mevcutLevelIlerleme / seviyeBasiXp) * 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5 text-right font-medium">Her {seviyeBasiXp} XP'de seviye atlarsın.</p>
          </div>
          
          {/* ÇIKIŞ YAP VE RAPOR BUTONLARI */}
          <div className="w-full max-w-md mx-auto md:mx-0 mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setOzetModalAcik(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-xs font-bold transition-transform hover:scale-105 shadow-sm cursor-pointer border border-transparent"
            >
              ✨ Haftalık Özeti Gör
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-red-100"
            >
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ROZETLER KOLEKSİYONU */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-sm border border-black/5 lg:col-span-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-serif text-gray-900 font-normal">Rozet Koleksiyonu</h3>
              <p className="text-xs text-gray-400 font-light">Kazanılan: {sahipOlunanRozetler.length} / {tumRozetler.length}</p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100">
              {sahipOlunanRozetler.length} Kilit Açık
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
            {tumRozetler.map(rozet => {
              const kilitAcik = sahipOlunanRozetler.includes(rozet.id);
              return (
                <div 
                  key={rozet.id} 
                  title={`${rozet.ad} (${rozet.detay})`}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all duration-300 relative group
                    ${kilitAcik ? 'bg-amber-50/50 border-amber-200/80 shadow-xs hover:scale-105' : 'bg-gray-50/60 border-dashed border-gray-200 grayscale opacity-40'}
                  `}
                >
                  <span className="text-2xl">{rozet.ikon}</span>
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-800 leading-tight">{rozet.ad}</h4>
                    <p className="text-[9px] text-gray-500 mt-0.5 font-light">{rozet.detay}</p>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-auto ${
                    rozet.tier === 'Bronz' ? 'bg-amber-100 text-amber-800' :
                    rozet.tier === 'Gümüş' ? 'bg-slate-200 text-slate-700' :
                    rozet.tier === 'Altın' ? 'bg-amber-300 text-amber-900' :
                    rozet.tier === 'Elmas' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {rozet.tier}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* GRAFİKLER VE XP TABLOSU BÖLÜMÜ */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-black/5 lg:col-span-2 flex flex-col gap-8">
          
          {/* XP TABLOSU */}
          <div>
            <h3 className="text-xl font-serif text-gray-900 mb-1 font-normal">XP Puanlama Sistemi</h3>
            <p className="text-xs text-gray-400 mb-4 font-light">Seviye atlamak ve rozet kazanmak için XP kazanma yolları.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {xpTablosu.map((item, idx) => (
                <div key={idx} className={`${item.bg} border border-black/5 rounded-2xl p-3 flex flex-col gap-1 shadow-xs`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.islem}</span>
                  <span className={`text-lg font-bold ${item.renk}`}>{item.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-serif text-gray-900 mb-1 font-normal">Haftalık Üretkenlik</h3>
                <p className="text-xs text-gray-400 font-light">Görev ve Alışkanlık Tamamlama Analizi</p>
              </div>
            </div>

            <div className="h-44 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={haftalikVeri}>
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <XAxis dataKey="gun" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <Bar dataKey="gorev" name="Tamamlanan Sınav Görevi" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={10} />
                  <Bar dataKey="aliskanlik" name="Uygulanan Alışkanlık" fill="#f97316" radius={[6, 6, 6, 6]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3 className="text-xl font-serif text-gray-900 mb-1 mt-2 font-normal">Aylık Enerji İvmesi</h3>
            <p className="text-xs text-gray-400 mb-4 font-light">Geçmişten bugüne üretkenlik çizgisi</p>

            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enerjiVerisi}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <XAxis dataKey="gun" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <Line type="monotone" dataKey="enerji" name="Tahmini Enerji Puanı" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 pt-6 border-t border-black/5">
              <h3 className="text-xl font-serif text-gray-900 mb-1 font-normal">Isı Haritası</h3>
              <p className="text-xs text-gray-400 mb-4 font-light">Son 140 gündeki faaliyet yoğunluğunuz.</p>
              
              <div className="w-full overflow-x-auto custom-scrollbar pb-3">
                <div className="flex gap-1" style={{ width: 'max-content' }}>
                  {Array.from({ length: 20 }).map((_, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }).map((_, rowIdx) => {
                        const dayIndex = colIdx * 7 + rowIdx;
                        if (dayIndex >= isiHaritasiVerisi.length) return null;
                        const veri = isiHaritasiVerisi[dayIndex];
                        const seviye = veri.count === 0 ? 'bg-gray-100' : veri.count <= 2 ? 'bg-emerald-200' : veri.count <= 5 ? 'bg-emerald-400' : 'bg-emerald-600';
                        return (
                          <div 
                            key={dayIndex} 
                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${seviye} transition-all hover:scale-125 cursor-help shadow-xs`} 
                            title={`${veri.tarih}: ${veri.count} Görev/Alışkanlık`} 
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-gray-500 font-medium">
                  <span>Daha az</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-100"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-200"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-400"></div>
                    <div className="w-3 h-3 rounded-sm bg-emerald-600"></div>
                  </div>
                  <span>Daha fazla</span>
                </div>
              </div>
            </div>
            
          </div>

        </div>
      </div>

      {/* HAFTALIK ÖZET (SPOTIFY WRAPPED) MODALI */}
      {ozetModalAcik && (
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aura-ozet-baslik"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOzetModalAcik(false);
          }}
        >
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-purple-900 to-black shadow-2xl border border-white/10">
            <button 
              onClick={() => setOzetModalAcik(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition z-10 cursor-pointer"
              aria-label="Özet modalını kapat"
            >
              ✕
            </button>
            
            <div className="p-8 pb-12 flex flex-col items-center text-center relative z-0">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
              
              <h2 id="aura-ozet-baslik" className="text-3xl font-serif text-white font-bold mb-2">Aura Özetin</h2>
              <p className="text-sm text-purple-200 font-light mb-8">Senin için geride bıraktığın haftanın kısa bir hikayesi.</p>
              
              <div className="space-y-4 w-full">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/5 transform transition hover:scale-105">
                  <span className="text-4xl block mb-2">🎯</span>
                  <h3 className="text-2xl font-bold text-white">{(haftalikVeri.reduce((a, b) => a + b.gorev, 0))} Görev</h3>
                  <p className="text-xs text-purple-200 mt-1">Bu hafta başarıyla tamamladın.</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/5 transform transition hover:scale-105">
                  <span className="text-4xl block mb-2">⚡</span>
                  <h3 className="text-2xl font-bold text-white">{(haftalikVeri.reduce((a, b) => a + b.aliskanlik, 0))} Kez</h3>
                  <p className="text-xs text-purple-200 mt-1">Alışkanlık zincirini kırmadın.</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/5 transform transition hover:scale-105">
                  <span className="text-4xl block mb-2">🌟</span>
                  <h3 className="text-xl font-bold text-white">{haftalikVeri.reduce((a, b) => a + b.gorev, 0) > 10 ? 'Mükemmel Bir Hafta!' : 'İstikrarlı Adımlar'}</h3>
                  <p className="text-xs text-purple-200 mt-1">Sanal ağacını büyütmeye devam et!</p>
                </div>
              </div>
              
              <button 
                onClick={() => setOzetModalAcik(false)}
                className="mt-8 bg-white text-indigo-900 px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition cursor-pointer"
              >
                Harika!
              </button>
            </div>
          </div>
        </div>,
        document.body
        )
      )}
    </div>
  );
}