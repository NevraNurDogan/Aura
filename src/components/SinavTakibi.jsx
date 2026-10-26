import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { usePomo } from '../context/PomoContext';

const OSYM_MUFREDATI = {
  "TYT": {
    "Türkçe": [
      "Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam ve Yapı", "Ses Bilgisi", 
      "Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı ve Ekler", 
      "İsimler ve Sıfatlar", "Zamirler ve Zarflar", "Edat-Bağlaç-Ünlem", 
      "Fiiller ve Fiilimsiler", "Cümlenin Ögeleri", "Cümle Türleri", "Anlatım Bozuklukları"
    ],
    "Matematik": [
      "Temel Kavramlar", "Sayı Basamakları", "Bölme ve Bölünebilme", "EBOB-EKOK", 
      "Rasyonel Sayılar", "Basit Eşitsizlikler", "Mutlak Değer", "Üslü Sayılar", 
      "Köklü Sayılar", "Çarpanlara Ayırma", "Oran-Orantı", "Denklem Çözme", 
      "Sayı ve Kesir Problemleri", "Yaş Problemleri", "Yüzde-Kâr-Zarar Problemleri", 
      "Karışım ve Hız Problemleri", "İşçi ve Rutin Olmayan Problemler", "Kümeler", 
      "Fonksiyonlar", "Polinomlar", "İkinci Dereceden Denklemler", "Mantık", 
      "Veri ve İstatistik", "Permütasyon-Kombinasyon-Olasılık"
    ],
    "Geometri": [
      "Doğruda ve Üçgende Açılar", "Özel Üçgenler (Dik, İkizkenar, Eşkenar)", 
      "Üçgende Alan ve Açıortay-Kenarortay", "Üçgende Benzerlik", 
      "Çokgenler ve Dörtgenler", "Yamuk ve Paralelkenar", "Eşkenar Dörtgen ve Kare", 
      "Deltoid ve Dikdörtgen", "Çember ve Daire", "Analitik Geometri", "Katı Cisimler (Prizma, Piramit, Silindir, Koni)"
    ],
    "Fizik": [
      "Fizik Bilimine Giriş", "Madde ve Özellikleri", "Hareket ve Kuvvet", 
      "İş, Güç ve Enerji", "Isı ve Sıcaklık", "Basınç ve Kaldırma Kuvveti", 
      "Elektrostatik ve Elektrik", "Dalgalar", "Optik"
    ],
    "Kimya": [
      "Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler", 
      "Maddenin Halleri", "Doğa ve Kimya", "Kimyanın Temel Kanunları ve Mol", 
      "Tepkime Türleri ve Hesaplamalar", "Karışımlar", "Asitler, Bazlar ve Tuzlar", "Kimya Her Yerde"
    ],
    "Biyoloji": [
      "Canlıların Ortak Özellikleri", "Canlıların Temel Bileşenleri", "Hücre ve Organelleri", 
      "Canlıların Sınıflandırılması", "Hücre Bölünmeleri (Mitoz-Mayoz)", "Kalıtım", 
      "Ekosistem Ekolojisi ve Çevre"
    ],
    "Tarih": [
      "Tarih ve Zaman", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", 
      "Türklerin İslamiyet'i Kabulü ve İlk Devletler", "Osmanlı Devleti (Kuruluş-Yükselme-Duraklama)", 
      "20. Yüzyıl Başlarında Osmanlı", "Milli Mücadele Dönemi", "Atatürkçülük ve İnkılaplar"
    ],
    "Coğrafya": [
      "Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum ve Harita Bilgisi", 
      "İklim Bilgisi", "Yerin Şekillenmesi (İç ve Dış Kuvvetler)", "Nüfus ve Yerleşme", 
      "Türkiye'nin Coğrafi Özellikleri", "Doğal Afetler"
    ],
    "Felsefe & Din": [
      "Felsefeyi Tanıma ve Düşünme", "Varlık ve Bilgi Felsefesi", "Ahlak ve Sanat Felsefesi", 
      "Din Felsefesi ve Siyaset", "İslam ve İbadet", "Gençlik ve Değerler"
    ]
  },
  "AYT": {
    "Matematik": [
      "Polinomlar", "İkinci Dereceden Denklemler", "Karmaşık Sayılar", "Parabol", 
      "Eşitsizlikler", "Trigonometri", "Logaritma", "Diziler", "Limit ve Süreklilik", 
      "Türev ve Uygulamaları", "İntegral ve Uygulamaları"
    ],
    "Geometri": [
      "Noktanın ve Doğrunun Analitiği", "Vektörler", "Çemberin Analitik İncelenmesi", 
      "Dönüşümler Geometrisi", "Uzay Geometrisi"
    ],
    "Fizik": [
      "Vektörler ve Bağıl Hareket", "Newton'un Hareket Yasaları", "Atışlar ve İvmeli Hareket", 
      "İş, Enerji ve Güç", "İtme ve Çizgisel Momentum", "Tork, Denge ve Basit Makineler", 
      "Elektriksel Kuvvet ve Potansiyel", "Düzgün Çembersel Hareket", "Basit Harmonik Hareket", 
      "Dalga Mekaniği", "Atom Fiziği ve Modern Fizik"
    ],
    "Kimya": [
      "Modern Atom Teorisi", "Gazlar", "Sıvı Çözeltiler ve Çözünürlük", 
      "Tepkimelerde Enerji ve Hız", "Kimyasal Denge", "Asit-Baz Dengesi", 
      "Çözünürlük Dengesi", "Kimya ve Elektrik", "Organik Kimyaya Giriş", "Organik Bileşikler"
    ],
    "Biyoloji": [
      "İnsan Fizyolojisi (Sinir, Duyu, Destek-Hareket)", "Sindirim, Dolaşım ve Solunum Sistemi", 
      "Boşaltım ve Üreme Sistemleri", "Komünite ve Popülasyon Ekolojisi", 
      "Genden Proteine (DNA-RNA)", "Canlılarda Enerji Dönüşümleri (Fotosentez-Solunum)", "Bitki Biyolojisi"
    ],
    "Edebiyat": [
      "Şiir Bilgisi ve Edebi Sanatlar", "İslamiyet Öncesi ve Halk Edebiyatı", 
      "Divan Edebiyatı", "Tanzimat ve Servet-i Fünun Edebiyatı", "Milli Edebiyat", "Cumhuriyet Dönemi Türk Edebiyatı", "Edebi Akımlar"
    ]
  },
  "KPSS Lisans": {
    "Türkçe": [
      "Sözcükte ve Cümlede Anlam", "Paragrafta Anlam ve Yapı", "Dil Bilgisi ve Ses Bilgisi", 
      "Yazım ve Noktalama", "Sözel Mantık"
    ],
    "Matematik & Geometri": [
      "Temel Kavramlar", "Bölme-Bölünebilme ve EBOB-EKOK", "Rasyonel Sayılar", 
      "Üslü ve Köklü İfadeler", "Çarpanlara Ayırma", "Oran-Orantı", "Problemler", 
      "Kümeler ve İşlem", "Sayısal Mantık", "Üçgenler ve Dörtgenler", "Analitik Geometri"
    ],
    "Tarih": [
      "İslamiyet Öncesi Türk Tarihi", "İlk Türk-İslam Devletleri", "Osmanlı Devleti Siyasi Tarihi", 
      "Osmanlı Kültür ve Medeniyeti", "20. Yüzyılda Osmanlı ve Milli Mücadele", 
      "Atatürk İlkeleri ve İnkılapları", "Çağdaş Türk ve Dünya Tarihi"
    ],
    "Coğrafya": [
      "Türkiye'nin Coğrafi Konumu", "Türkiye'nin Fiziki Coğrafyası (Dağlar, Ovalar, İklim)", 
      "Türkiye'de Nüfus ve Yerleşme", "Türkiye'de Tarım, Hayvancılık ve Madenler", 
      "Türkiye'de Sanayi, Ulaşım ve Turizm"
    ],
    "Vatandaşlık": [
      "Temel Hukuk Kavramları", "Anayasa Hukuku ve Temel Haklar", "1982 Anayasası ve Devlet Organları", 
      "İdare Hukuku", "Güncel Bilgiler"
    ]
  },
  "ALES": {
    "Sayısal": [
      "Temel Kavramlar", "Rasyonel Sayılar", "EBOB-EKOK", "Denklem Çözme", 
      "Basit Eşitsizlikler ve Mutlak Değer", "Üslü ve Köklü İfadeler", "Problemler (Sayı, Kesir, Yaş, Yüzde)", 
      "Kümeler ve Olasılık", "Sayısal Mantık ve Grafik Yorumlama", "Geometri"
    ],
    "Sözel": [
      "Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Yapı ve Ana Düşünce", 
      "Cümle Tamamlama ve Çeviri", "Sözel Mantık (Sıralama ve Tablo Okuma)"
    ]
  },
  "YÖKDİL / YDS": {
    "İngilizce": [
      "Kelime Bilgisi (Vocabulary & Phrasal Verbs)", "Zamanlar (Tenses & Passive)", 
      "Modals & Conditionals", "Bağlaçlar (Conjunctions)", "Relative & Noun Clauses", 
      "Cümle Tamamlama", "Çeviri (İng-Tr / Tr-İng)", "Paragraf Tamamlama ve Anlamı Bozan Cümle", "Okuma Paragrafları"
    ]
  },
  "DGS": {
    "Sayısal": [
      "Temel Matematik", "Problemler", "Sayısal Mantık", "Geometri"
    ],
    "Sözel": [
      "Paragraf Bilgisi", "Cümlede Anlam", "Sözel Mantık"
    ]
  },
  "LGS": {
    "Türkçe": ["Fiilimsiler", "Cümlenin Ögeleri", "Söz Sanatları", "Paragraf", "Yazım Kuralları"],
    "Matematik": ["Çarpanlar ve Katlar", "Üslü İfadeler", "Kareköklü İfadeler", "Veri Analizi", "Olasılık", "Cebirsel İfadeler"],
    "Fen Bilimleri": ["Mevsimler ve İklim", "DNA ve Genetik Kod", "Basınç", "Madde ve Endüstri"]
  }
};

const tumResmiMufredatiOlustur = () => {
  let idCounter = 1;
  const tumListe = [];
  Object.keys(OSYM_MUFREDATI).forEach(sinavAdi => {
    const derslerObj = OSYM_MUFREDATI[sinavAdi];
    Object.keys(derslerObj).forEach(dersAdi => {
      derslerObj[dersAdi].forEach(konuAdi => {
        tumListe.push({
          id: `ref_${sinavAdi}_${dersAdi}_${konuAdi}`.replace(/\s+/g, '_'),
          sinav: sinavAdi,
          ders: dersAdi,
          ad: konuAdi,
          yapilanTekrar: 0,
          hedefTekrar: 3,
          yildizli: false,
          tamamlandi: false
        });
      });
    });
  });
  return tumListe;
};

const mufredatiBirlesiveGuncelle = (mevcutKonular) => {
  const tamMufredat = tumResmiMufredatiOlustur();
  const mevcutMap = new Map();

  if (Array.isArray(mevcutKonular)) {
    mevcutKonular.forEach(k => {
      if (k && k.sinav && k.ders && k.ad) {
        const key = `${k.sinav}_${k.ders}_${k.ad}`.toLowerCase().trim();
        mevcutMap.set(key, k);
      }
    });
  }

  const birlesik = tamMufredat.map(refKonu => {
    const key = `${refKonu.sinav}_${refKonu.ders}_${refKonu.ad}`.toLowerCase().trim();
    if (mevcutMap.has(key)) {
      const saved = mevcutMap.get(key);
      return {
        ...refKonu,
        ...saved,
        tamamlandi: Boolean(saved.tamamlandi),
        yildizli: Boolean(saved.yildizli),
        id: saved.id || refKonu.id
      };
    }
    return refKonu;
  });

  if (Array.isArray(mevcutKonular)) {
    mevcutKonular.forEach(k => {
      if (k && k.sinav && k.ders && k.ad) {
        const key = `${k.sinav}_${k.ders}_${k.ad}`.toLowerCase().trim();
        const resmiVarMi = tamMufredat.some(r => `${r.sinav}_${r.ders}_${r.ad}`.toLowerCase().trim() === key);
        if (!resmiVarMi) {
          birlesik.push({ ...k, tamamlandi: Boolean(k.tamamlandi), yildizli: Boolean(k.yildizli) });
        }
      }
    });
  }

  return birlesik;
};

export default function SinavTakibi() {
  const [aktifTab, setAktifTab] = useState('Konular');
  
  const [seciliSinavTurleri, setSeciliSinavTurleri] = useState(() => {
    const cached = localStorage.getItem('lifeos_secili_sinavlar');
    return cached ? JSON.parse(cached) : ['TYT', 'AYT'];
  });

  const [aktifSinav, setAktifSinav] = useState('TYT');
  const [sinavYonetenPanelAcik, setSinavYonetenPanelAcik] = useState(false);
  const [yeniOzelSinavAdi, setYeniOzelSinavAdi] = useState('');

  const [konular, setKonular] = useState([]);
  const [aktifDers, setAktifDers] = useState('');
  const [yeniKonu, setYeniKonu] = useState('');

  const [gunlukGorevler, setGunlukGorevler] = useState([]);
  const [yeniGorev, setYeniGorev] = useState('');
  const [duzenlenenGorevId, setDuzenlenenGorevId] = useState(null);
  const bugunStr = new Date().toISOString().split('T')[0];
  const [seciliGorevTarihi, setSeciliGorevTarihi] = useState(bugunStr);
  const [gecmisArsivAcik, setGecmisArsivAcik] = useState(false);

  const [denemeler, setDenemeler] = useState([]);
  const [duzenlenenDenemeId, setDuzenlenenDenemeId] = useState(null);
  const [denemeForm, setDenemeForm] = useState({
    tarih: bugunStr,
    denemeAdi: '',
    ders: '',
    dogru: '',
    yanlis: '',
    bos: '',
    eksikKonular: '' 
  });

  // DENEME GRAFİĞİ FİLTRESİ
  const [grafikDersFiltresi, setGrafikDersFiltresi] = useState('Tümü');

  // POMODORO STATE'LERİ GLOBAL CONTEXT'TEN ALINIYOR
  const { pomoMod, setPomoMod, pomoSure, setPomoSure, tamamlananPomo, setTamamlananPomo, setAktifSinav: setGlobalAktifSinav } = usePomo();

  // Sınav seçildiğinde global aktif sınavı güncelle
  useEffect(() => {
    setGlobalAktifSinav(aktifSinav);
  }, [aktifSinav, setGlobalAktifSinav]);



  const togglePomodoro = () => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    if (pomoMod === 'bosta' || pomoMod === 'mola_bekliyor') {
      setPomoMod('calisiyor');
      if (pomoMod === 'bosta') setPomoSure(25 * 60);
    } else if (pomoMod === 'calisiyor') {
      setPomoMod('duraklatildi');
    } else if (pomoMod === 'duraklatildi') {
      setPomoMod('calisiyor');
    }
  };

  const iptalPomodoro = () => {
    setPomoMod('bosta');
    setPomoSure(25 * 60);
  };

  const startMola = () => {
    setPomoMod('mola');
    setPomoSure(5 * 60);
  };

  const resetPomodoro = () => {
    setPomoMod('bosta');
    setPomoSure(25 * 60);
  };

  const formatZaman = (saniye) => {
    const dk = Math.floor(saniye / 60);
    const sn = saniye % 60;
    return `${dk.toString().padStart(2, '0')}:${sn.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    localStorage.setItem('lifeos_secili_sinavlar', JSON.stringify(seciliSinavTurleri));
  }, [seciliSinavTurleri]);

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    let hamKonular = [];
    try {
      const q = query(collection(db, 'exam_topics'), where('userId', '==', userId));
      const snap = await getDocs(q);
      hamKonular = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.warn("Firebase konular çekilemedi."); }

    const tamMufredatListesi = mufredatiBirlesiveGuncelle(hamKonular);
    setKonular(tamMufredatListesi);
    localStorage.setItem('lifeos_sinav_konular_cache', JSON.stringify(tamMufredatListesi));

    if (seciliSinavTurleri.length > 0 && !seciliSinavTurleri.includes(aktifSinav)) {
      setAktifSinav(seciliSinavTurleri[0]);
    }

    try {
      const q = query(collection(db, 'tasks'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGunlukGorevler(data);
    } catch (e) { console.warn("Görevler çekilemedi"); }

    try {
      const q = query(collection(db, 'exams'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const formatliData = data.map(d => ({
        ...d,
        eksikKonuListesi: d.eksikKonularDurum 
          ? JSON.parse(d.eksikKonularDurum) 
          : (d.eksikKonular ? d.eksikKonular.split(',').map(k => ({ ad: k.trim(), bitti: false })).filter(k => k.ad.length > 0) : [])
      })).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
      setDenemeler(formatliData);
    } catch (e) { console.warn("Denemeler çekilemedi"); }
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const konulariKaydetLocal = (yeniKonular) => {
    setKonular(yeniKonular);
    localStorage.setItem('lifeos_sinav_konular_cache', JSON.stringify(yeniKonular));
  };

  useEffect(() => {
    const sinavinKonulari = konular.filter(k => k.sinav === aktifSinav);
    if (sinavinKonulari.length > 0) {
      const dersler = [...new Set(sinavinKonulari.map(k => k.ders))];
      if (!aktifDers || !dersler.includes(aktifDers)) {
        setAktifDers(dersler[0]);
        setDenemeForm(prev => ({ ...prev, ders: dersler[0] }));
      }
    }
  }, [aktifSinav]);

  const sinavToggle = (sinavAdi) => {
    let yeniSecim = [];
    if (seciliSinavTurleri.includes(sinavAdi)) {
      if (seciliSinavTurleri.length === 1) {
        alert("En az 1 aktif sınav seçili olmalıdır.");
        return;
      }
      yeniSecim = seciliSinavTurleri.filter(s => s !== sinavAdi);
    } else {
      yeniSecim = [...seciliSinavTurleri, sinavAdi];
    }
    setSeciliSinavTurleri(yeniSecim);
    if (!yeniSecim.includes(aktifSinav)) {
      setAktifSinav(yeniSecim[0]);
    }
  };

  const ozelSinavEkle = () => {
    if (!yeniOzelSinavAdi.trim()) return;
    const ad = yeniOzelSinavAdi.trim();
    if (!seciliSinavTurleri.includes(ad)) {
      setSeciliSinavTurleri(prev => [...prev, ad]);
    }
    setAktifSinav(ad);
    setAktifDers('Genel');
    setYeniOzelSinavAdi('');
  };

  const konuEkle = async () => { 
    if (!yeniKonu.trim() || !aktifDers) return;
    const yId = `ref_${aktifSinav}_${aktifDers}_${yeniKonu.trim()}`.replace(/\s+/g, '_').toLowerCase();
    const yeniVeri = { userId, sinav: aktifSinav, ders: aktifDers, ad: yeniKonu.trim(), yapilanTekrar: 0, hedefTekrar: 3, yildizli: false, tamamlandi: false, id: yId };
    
    // Check if exists
    const exists = konular.some(k => k.id === yId);
    if (!exists) {
      const yeniListe = [...konular, yeniVeri];
      konulariKaydetLocal(yeniListe);
    }
    setYeniKonu('');

    try {
      await setDoc(doc(db, 'exam_topics', yId), yeniVeri);
    } catch (error) { console.warn("Konu eklenemedi"); }
  };

  const konuGuncelle = async (konu, yeniAlanlar) => {
    const guncel = { ...konu, ...yeniAlanlar };
    const yeniListe = konular.map(k => k.id === konu.id ? guncel : k);
    konulariKaydetLocal(yeniListe);

    try {
      await setDoc(doc(db, 'exam_topics', konu.id), { ...guncel, userId }, { merge: true });
    } catch (error) { console.warn("Konu güncellenemedi"); }
  };

  const konuSil = async (id) => {
    const yeniListe = konular.filter(k => k.id !== id);
    konulariKaydetLocal(yeniListe);
    try {
      await deleteDoc(doc(db, 'exam_topics', id));
    } catch (error) {}
  };

  const gorevEkle = async () => { 
    if (!yeniGorev.trim()) return;
    const hedefTarih = seciliGorevTarihi || bugunStr;
    const guncelMetin = yeniGorev.trim();

    if (duzenlenenGorevId) {
      setGunlukGorevler(prev => prev.map(g => g.id === duzenlenenGorevId ? { ...g, gorev: guncelMetin } : g));
      try {
        await updateDoc(doc(db, 'tasks', duzenlenenGorevId), { gorev: guncelMetin });
      } catch (error) { console.warn("Görev güncellenemedi"); }
      setDuzenlenenGorevId(null);
      setYeniGorev('');
      return;
    }

    const yeniVeri = { userId, tarih: hedefTarih, gorev: guncelMetin, bitti: false };
    
    try {
      const docRef = await addDoc(collection(db, 'tasks'), yeniVeri);
      const eklendi = { ...yeniVeri, id: docRef.id };
      setGunlukGorevler([eklendi, ...gunlukGorevler]);
    } catch (error) { console.warn("Görev eklenemedi"); }
    setYeniGorev('');
  };

  const gorevToggle = async (g) => {
    const guncel = { ...g, bitti: !g.bitti };
    const yeniGorevler = gunlukGorevler.map(item => item.id === g.id ? guncel : item);
    setGunlukGorevler(yeniGorevler);

    try {
      await updateDoc(doc(db, 'tasks', g.id), { bitti: guncel.bitti });
    } catch (error) { console.warn("Görev güncellenemedi"); }
  };

  const gorevSil = async (id) => {
    const yeniGorevler = gunlukGorevler.filter(g => g.id !== id);
    setGunlukGorevler(yeniGorevler);
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) {}
  };

  const denemeEkle = async () => {
    if (!denemeForm.denemeAdi.trim() || !denemeForm.ders) {
      alert("Lütfen deneme adı ve ders seçiniz.");
      return;
    }

    const yeniDeneme = {
      userId,
      denemeAdi: denemeForm.denemeAdi,
      ders: denemeForm.ders,
      tarih: denemeForm.tarih,
      dogru: parseInt(denemeForm.dogru) || 0,
      yanlis: parseInt(denemeForm.yanlis) || 0,
      bos: parseInt(denemeForm.bos) || 0,
      eksikKonular: denemeForm.eksikKonular,
      eksikKonularDurum: JSON.stringify(denemeForm.eksikKonular ? denemeForm.eksikKonular.split(',').map(k => ({ ad: k.trim(), bitti: false })).filter(k => k.ad.length > 0) : [])
    };

    if (duzenlenenDenemeId) {
      setDenemeler(prev => prev.map(d => d.id === duzenlenenDenemeId ? { ...d, ...yeniDeneme, eksikKonuListesi: JSON.parse(yeniDeneme.eksikKonularDurum) } : d));
      try {
        await setDoc(doc(db, 'exams', duzenlenenDenemeId), yeniDeneme, { merge: true });
      } catch (error) { console.warn("Deneme güncellenemedi"); }
      
      setDuzenlenenDenemeId(null);
    } else {
      try {
        const docRef = await addDoc(collection(db, 'exams'), yeniDeneme);
        const eklendi = {
          ...yeniDeneme,
          id: docRef.id,
          eksikKonuListesi: yeniDeneme.eksikKonular ? yeniDeneme.eksikKonular.split(',').map(k => ({ ad: k.trim(), bitti: false })).filter(k => k.ad.length > 0) : []
        };
        setDenemeler([eklendi, ...denemeler].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)));
      } catch (error) { console.warn("Deneme eklenemedi"); }
    }

    setDenemeForm({
      tarih: bugunStr,
      denemeAdi: '',
      ders: aktifDers || '',
      dogru: '',
      yanlis: '',
      bos: '',
      eksikKonular: ''
    });
  };

  const denemeSil = async (id) => {
    if(window.confirm("Bu denemeyi silmek istediğinize emin misiniz?")) {
      setDenemeler(prev => prev.filter(d => d.id !== id));
      try {
        await deleteDoc(doc(db, 'exams', id));
      } catch (e) { console.warn("Deneme silinemedi"); }
    }
  };

  const denemeDuzenle = (d) => {
    setDuzenlenenDenemeId(d.id);
    setDenemeForm({
      tarih: d.tarih || bugunStr,
      denemeAdi: d.denemeAdi || '',
      ders: d.ders || '',
      dogru: d.dogru === 0 ? '' : d.dogru,
      yanlis: d.yanlis === 0 ? '' : d.yanlis,
      bos: d.bos === 0 ? '' : d.bos,
      eksikKonular: d.eksikKonular || ''
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const eksikKonuToggle = async (denemeId, konuIndex) => {
    let guncelDeneme = null;
    setDenemeler(prev => prev.map(d => {
      if (d.id === denemeId) {
        const yeniListe = [...d.eksikKonuListesi];
        yeniListe[konuIndex].bitti = !yeniListe[konuIndex].bitti;
        guncelDeneme = { ...d, eksikKonuListesi: yeniListe };
        return guncelDeneme;
      }
      return d;
    }));

    if (guncelDeneme) {
      try {
        await updateDoc(doc(db, 'exams', denemeId), {
          eksikKonularDurum: JSON.stringify(guncelDeneme.eksikKonuListesi)
        });
      } catch (error) { console.warn("Eksik konu güncellenemedi"); }
    }
  };

  const sinavinKonulari = konular.filter(k => k.sinav === aktifSinav);
  const mevcutDersler = [...new Set(sinavinKonulari.map(k => k.ders))];
  const seciliDersinKonulari = sinavinKonulari.filter(k => k.ders === aktifDers);

  const toplamKonuSayisi = sinavinKonulari.length;
  const bitenKonuSayisi = sinavinKonulari.filter(k => k.tamamlandi).length;
  const yuzde = toplamKonuSayisi > 0 ? Math.round((bitenKonuSayisi / toplamKonuSayisi) * 100) : 0;

  // SEÇİLİ TARİHE GÖRE GÖREVLER
  const seciliTarihGorevleri = gunlukGorevler.filter(g => g.tarih === seciliGorevTarihi);

  // TARİHLERE GÖRE GRUPLANMIŞ GEÇMİŞ ÇALIŞMA GÜNLÜĞÜ
  const tarihlereGoreGorevler = gunlukGorevler.reduce((acc, curr) => {
    const t = curr.tarih || bugunStr;
    if (!acc[t]) acc[t] = [];
    acc[t].push(curr);
    return acc;
  }, {});

  const tumTarihler = Object.keys(tarihlereGoreGorevler).sort().reverse();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* ÜST BAŞLIK VE SINAV SEÇİCİ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-black/5 pb-5">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal">Sınav & Müfredat Takibi</h2>
          <p className="text-xs text-gray-400 font-light">Sadece takip etmek istediğiniz sınavları aktif edin, günlük çalışma günlüğünüzü izleyin.</p>
        </div>

        {/* SINAV SEÇME VE AKTİF SINAVLARI YÖNETME */}
        <div className="flex items-center gap-2 relative self-stretch sm:self-auto">
          <select 
            value={aktifSinav} 
            onChange={(e) => setAktifSinav(e.target.value)}
            className="bg-white/80 border border-black/5 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 shadow-xs focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {seciliSinavTurleri.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={() => setSinavYonetenPanelAcik(!sinavYonetenPanelAcik)} 
            className="px-3.5 py-2.5 rounded-2xl bg-gray-900 text-white hover:bg-black text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap"
            title="Görmek istediğiniz sınavları seçin"
          >
            ⚙️ Sınavlarımı Yönet
          </button>

          {/* AKTİF SINAV SEÇİM PANELİ (POPUP) */}
          {sinavYonetenPanelAcik && (
            <div className="absolute right-0 top-12 w-80 bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-black/5 z-50 animate-fade-in space-y-3">
              <div className="flex justify-between items-center border-b border-black/5 pb-2">
                <h4 className="font-bold text-gray-800 text-xs">Takip Edilecek Sınavlar</h4>
                <button onClick={() => setSinavYonetenPanelAcik(false)} className="text-gray-400 hover:text-gray-700 text-xs p-1 cursor-pointer">✕</button>
              </div>
              <p className="text-[11px] text-gray-400 font-light">Sayfanızda yalnızca işaretlediğiniz sınavlar görünür. Tüm müfredatlar saklı tutulur.</p>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {Object.keys(OSYM_MUFREDATI).map(sAdi => {
                  const secili = seciliSinavTurleri.includes(sAdi);
                  return (
                    <label key={sAdi} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition cursor-pointer text-xs font-semibold text-gray-800 border border-transparent hover:border-black/5">
                      <span>{sAdi}</span>
                      <input 
                        type="checkbox" 
                        checked={secili} 
                        onChange={() => sinavToggle(sAdi)} 
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-black/5 flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Özel Sınav (TUS, DUS)" 
                  value={yeniOzelSinavAdi}
                  onChange={(e) => setYeniOzelSinavAdi(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ozelSinavEkle()}
                  className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
                <button onClick={ozelSinavEkle} className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer">Ekle</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* İLERLEME KARTI */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1.5">
            <span>{aktifSinav} Genel Tamamlanma Oranı</span>
            <span className="text-blue-600 font-bold">%{yuzde} ({bitenKonuSayisi}/{toplamKonuSayisi} Konu)</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-700" style={{ width: `${yuzde}%` }}></div>
          </div>
        </div>
      </div>

      {/* TAB MENÜSÜ */}
      <div className="flex gap-2 overflow-x-auto border-b border-black/5 pb-2 custom-scrollbar">
        {['Konular', 'Günlük Görevler', 'Deneme Analizi', 'Pomodoro'].map(tab => (
          <button
            key={tab}
            onClick={() => setAktifTab(tab)}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${aktifTab === tab ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-500 hover:bg-black/5'}`}
          >
            {tab === 'Konular' ? '📚 Konu Müfredatı' : tab === 'Günlük Görevler' ? '🎯 Çalışma Günlüğü' : tab === 'Deneme Analizi' ? '📊 Deneme Analizi' : '🍅 Pomodoro'}
          </button>
        ))}
      </div>

      {/* 1. TAB: KONU TAKİBİ */}
      {aktifTab === 'Konular' && (
        <div className="space-y-6 animate-fade-in">
          {/* DERS SEÇİCİ SEKMELERİ */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {mevcutDersler.map(ders => (
              <button
                key={ders}
                onClick={() => setAktifDers(ders)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${aktifDers === ders ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/80 text-gray-700 border border-black/5 hover:bg-white'}`}
              >
                {ders}
              </button>
            ))}
          </div>

          {/* YENİ KONU EKLEME BAR */}
          <div className="flex gap-2 bg-white/80 p-2 rounded-2xl border border-black/5 shadow-xs">
            <input 
              type="text" 
              placeholder={`${aktifDers || 'Ders'} dersine yeni konu ekle...`}
              value={yeniKonu}
              onChange={(e) => setYeniKonu(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && konuEkle()}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:outline-none"
            />
            <button onClick={konuEkle} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black transition cursor-pointer shadow-xs">+ Ekle</button>
          </div>

          {/* KONU LİSTESİ TABLOSU */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-black/5 flex justify-between items-center">
              <h3 className="font-serif text-lg text-gray-900 font-normal">{aktifDers} Konu Listesi</h3>
              <span className="text-xs text-gray-400 font-light">
                {seciliDersinKonulari.filter(k => k.tamamlandi).length} / {seciliDersinKonulari.length} Bitti
              </span>
            </div>

            <div className="divide-y divide-black/5">
              {seciliDersinKonulari.map(konu => (
                <div key={konu.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition group">
                  <div className="flex items-center gap-3 flex-1">
                    <input 
                      type="checkbox" 
                      checked={Boolean(konu.tamamlandi)} 
                      onChange={() => konuGuncelle(konu, { tamamlandi: !konu.tamamlandi })}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                    <button 
                      onClick={() => konuGuncelle(konu, { yildizli: !konu.yildizli })}
                      className={`text-base cursor-pointer transition ${konu.yildizli ? 'text-amber-400' : 'text-gray-300 opacity-40 group-hover:opacity-100'}`}
                      title="Önemli/Yıldızlı Konu"
                    >
                      ★
                    </button>
                    <span className={`text-xs sm:text-sm font-medium ${konu.tamamlandi ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {konu.ad}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-gray-100/70 px-2.5 py-1 rounded-lg border border-black/5">
                      <span className="text-[10px] text-gray-400 font-medium">Tekrar:</span>
                      <button onClick={() => konuGuncelle(konu, { yapilanTekrar: Math.max(0, konu.yapilanTekrar - 1) })} className="text-gray-500 hover:text-black font-bold text-xs p-0.5 cursor-pointer">-</button>
                      <span className="text-xs font-bold text-gray-700">{konu.yapilanTekrar}/{konu.hedefTekrar}</span>
                      <button onClick={() => konuGuncelle(konu, { yapilanTekrar: konu.yapilanTekrar + 1 })} className="text-gray-500 hover:text-black font-bold text-xs p-0.5 cursor-pointer">+</button>
                    </div>

                    <button onClick={() => konuSil(konu.id)} className="text-gray-300 hover:text-red-500 text-xs p-1 cursor-pointer transition">🗑️</button>
                  </div>
                </div>
              ))}

              {seciliDersinKonulari.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-xs font-light">Bu derse henüz konu eklenmemiş.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: GÜNLÜK ÇALIŞMA GÜNLÜĞÜ VE GEÇMİŞ TAKİBİ */}
      {aktifTab === 'Günlük Görevler' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* TARİH SEÇİCİ BAR VE YENİ GÖREV EKLEME */}
          <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-black/5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Güne Özel Çalışma Görevi Ekle</h3>
                <p className="text-[11px] text-gray-400 font-light">Seçtiğiniz tarihe veya bugüne çalışma hedefi ekleyebilirsiniz.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Tarih Seç:</span>
                <input 
                  type="date" 
                  value={seciliGorevTarihi} 
                  onChange={(e) => setSeciliGorevTarihi(e.target.value)}
                  className="p-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-semibold text-gray-800 focus:outline-none"
                />
                {seciliGorevTarihi !== bugunStr && (
                  <button 
                    onClick={() => setSeciliGorevTarihi(bugunStr)}
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 cursor-pointer"
                  >
                    Bugüne Dön
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder={`${seciliGorevTarihi === bugunStr ? 'Bugün' : seciliGorevTarihi} tarihinde çalışılacak hedef / çözülecek soru...`} 
                value={yeniGorev}
                onChange={(e) => setYeniGorev(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && gorevEkle()}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-blue-400"
              />
              <button onClick={gorevEkle} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black transition cursor-pointer shadow-xs whitespace-nowrap">
                {duzenlenenGorevId ? 'Güncelle' : '+ Görev Ekle'}
              </button>
              {duzenlenenGorevId && (
                <button 
                  onClick={() => { setDuzenlenenGorevId(null); setYeniGorev(''); }} 
                  className="bg-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-300 transition cursor-pointer"
                >
                  İptal
                </button>
              )}
            </div>
          </div>

          {/* SEÇİLİ TARİHİN ÇALIŞMA LİSTESİ */}
          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-3">
            <div className="flex justify-between items-center border-b border-black/5 pb-3">
              <h3 className="font-serif text-lg text-gray-900 font-normal">
                {seciliGorevTarihi === bugunStr ? 'Bugünün Çalışma Görevleri' : `${seciliGorevTarihi} Tarihli Görevler`}
              </h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                {seciliTarihGorevleri.filter(g => g.bitti).length} / {seciliTarihGorevleri.length} Bitti
              </span>
            </div>
            
            <div className="flex flex-col gap-2">
              {seciliTarihGorevleri.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3.5 bg-white/70 rounded-2xl border border-black/5 hover:border-gray-200 transition">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={g.bitti} onChange={() => gorevToggle(g)} className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                    <span className={`text-xs sm:text-sm font-medium ${g.bitti ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{g.gorev}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.bitti && <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-md">Tamamlandı +15 XP</span>}
                    <button 
                      onClick={() => {
                        setYeniGorev(g.gorev);
                        setDuzenlenenGorevId(g.id);
                        setSeciliGorevTarihi(g.tarih);
                        window.scrollTo({top: 0, behavior: 'smooth'});
                      }}
                      className="text-gray-400 hover:text-blue-500 text-sm p-1 cursor-pointer"
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button onClick={() => gorevSil(g.id)} className="text-gray-300 hover:text-red-500 text-xs p-1 cursor-pointer">🗑️</button>
                  </div>
                </div>
              ))}

              {seciliTarihGorevleri.length === 0 && (
                <p className="text-xs text-gray-400 font-light py-6 text-center">Bu tarih için kaydedilmiş çalışma görevi yok.</p>
              )}
            </div>
          </div>

          {/* GEÇMİŞ GÜNLERİN ÇALIŞMA TAKİBİ VE ARŞİVİ */}
          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg text-gray-900 font-normal">📜 Geçmiş Günlerde Ne Çalıştım? (Geçmiş Takibi)</h3>
                <p className="text-xs text-gray-400 font-light">Tüm günlerde tamamladığınız ders çalışma geçmişinizin kronolojik dökümü.</p>
              </div>
              <button 
                onClick={() => setGecmisArsivAcik(!gecmisArsivAcik)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {gecmisArsivAcik ? 'Gizle ▲' : 'Tüm Geçmişi Göster ▼'}
              </button>
            </div>

            {gecmisArsivAcik && (
              <div className="space-y-4 pt-3 border-t border-black/5 animate-fade-in">
                {tumTarihler.map(tarihStr => {
                  const tarihinGorevleri = tarihlereGoreGorevler[tarihStr];
                  const biten = tarihinGorevleri.filter(g => g.bitti).length;
                  const toplam = tarihinGorevleri.length;

                  return (
                    <div key={tarihStr} className="p-4 bg-gray-50/70 rounded-2xl border border-black/5 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">🗓️ {tarihStr === bugunStr ? `${tarihStr} (Bugün)` : tarihStr}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({toplam} Hedef)</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${biten === toplam ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {biten}/{toplam} Tamamlandı
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tarihinGorevleri.map(g => (
                          <div key={g.id} className="flex items-center gap-2 text-xs p-2 bg-white rounded-xl border border-black/5">
                            <span className={g.bitti ? 'text-green-500 font-bold' : 'text-gray-300'}>{g.bitti ? '✓' : '○'}</span>
                            <span className={`flex-1 font-medium ${g.bitti ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{g.gorev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {tumTarihler.length === 0 && (
                  <p className="text-xs text-gray-400 font-light text-center py-4">Henüz kaydedilmiş çalışma geçmişi bulunmuyor.</p>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. TAB: DENEME ANALİZİ */}
      {aktifTab === 'Deneme Analizi' && (
        <div className="space-y-6 animate-fade-in">
          {/* DENEME EKLEME FORMU */}
          <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-4">
            <h3 className="font-serif text-lg text-gray-900 font-normal">
              {duzenlenenDenemeId ? 'Deneme Kaydını Düzenle' : 'Yeni Deneme Kaydı & Analizi'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input 
                type="text" 
                placeholder="Deneme Adı (Örn: Yayın Deneme #1)" 
                value={denemeForm.denemeAdi}
                onChange={(e) => setDenemeForm({...denemeForm, denemeAdi: e.target.value})}
                className="p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm focus:outline-none"
              />
              <select 
                value={denemeForm.ders}
                onChange={(e) => setDenemeForm({...denemeForm, ders: e.target.value})}
                className="p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm font-medium text-gray-700"
              >
                <option value="">Ders Seçiniz</option>
                {mevcutDersler.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input 
                type="date" 
                value={denemeForm.tarih}
                onChange={(e) => setDenemeForm({...denemeForm, tarih: e.target.value})}
                className="p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm text-gray-700"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input 
                type="number" 
                placeholder="Doğru Sayısı" 
                value={denemeForm.dogru}
                onChange={(e) => setDenemeForm({...denemeForm, dogru: e.target.value})}
                className="p-3 border border-green-200 bg-green-50/50 text-green-700 font-semibold rounded-xl text-xs sm:text-sm focus:outline-none"
              />
              <input 
                type="number" 
                placeholder="Yanlış Sayısı" 
                value={denemeForm.yanlis}
                onChange={(e) => setDenemeForm({...denemeForm, yanlis: e.target.value})}
                className="p-3 border border-red-200 bg-red-50/50 text-red-700 font-semibold rounded-xl text-xs sm:text-sm focus:outline-none"
              />
              <input 
                type="number" 
                placeholder="Boş Sayısı" 
                value={denemeForm.bos}
                onChange={(e) => setDenemeForm({...denemeForm, bos: e.target.value})}
                className="p-3 border border-gray-200 bg-gray-50 text-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <input 
              type="text" 
              placeholder="Yapılamayan/Eksik Konular (Virgülle ayırın: Örn: Üslü Sayılar, Paragraf)" 
              value={denemeForm.eksikKonular}
              onChange={(e) => setDenemeForm({...denemeForm, eksikKonular: e.target.value})}
              className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              {duzenlenenDenemeId && (
                <button 
                  onClick={() => {
                    setDuzenlenenDenemeId(null);
                    setDenemeForm({ tarih: bugunStr, denemeAdi: '', ders: aktifDers || '', dogru: '', yanlis: '', bos: '', eksikKonular: '' });
                  }}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300 transition cursor-pointer"
                >
                  İptal
                </button>
              )}
              <button onClick={denemeEkle} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition cursor-pointer shadow-xs">
                {duzenlenenDenemeId ? 'Değişiklikleri Kaydet' : 'Denemeyi Kaydet & Analiz Et'}
              </button>
            </div>
          </div>

          {/* DENEME GRAFİĞİ */}
          {denemeler.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/5 pb-3 gap-3">
                <h3 className="font-serif text-sm sm:text-base text-gray-900 font-normal">Net Gelişim Grafiği</h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">Filtre:</span>
                  <select 
                    value={grafikDersFiltresi}
                    onChange={(e) => setGrafikDersFiltresi(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-xs text-gray-700 py-1.5 px-3 rounded-lg focus:outline-none"
                  >
                    <option value="Tümü">Tüm Dersler (Karma)</option>
                    {[...new Set(denemeler.map(d => d.ders))].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {denemeler.filter(d => grafikDersFiltresi === 'Tümü' || d.ders === grafikDersFiltresi).length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...denemeler.filter(d => grafikDersFiltresi === 'Tümü' || d.ders === grafikDersFiltresi)].reverse()} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="tarih" tick={{ fontSize: 10 }} tickFormatter={t => t.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Line type="monotone" dataKey={(d) => d.dogru - (d.yanlis * 0.25)} name="Net" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs font-light">
                  Seçilen ders için henüz deneme verisi yok.
                </div>
              )}
            </div>
          )}

          {/* GEÇMİŞ DENEMELER LİSTESİ */}
          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 space-y-4">
            <h3 className="font-serif text-lg text-gray-900 font-normal border-b border-black/5 pb-3">Deneme Geçmişi & Eksik Konu Tekrarları</h3>
            
            <div className="flex flex-col gap-4">
              {denemeler.map(d => {
                const net = (d.dogru || 0) - ((d.yanlis || 0) * 0.25);
                return (
                  <div key={d.id} className="p-4 bg-white/70 rounded-2xl border border-black/5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{d.denemeAdi} ({d.ders})</h4>
                        <p className="text-[11px] text-gray-400">{d.tarih}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-green-600 font-bold">{d.dogru} D</span>
                        <span className="text-red-500 font-bold">{d.yanlis} Y</span>
                        <span className="text-gray-400 font-bold">{d.bos} B</span>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100 font-bold text-xs">
                          {net.toFixed(2)} NET
                        </span>
                        
                        <div className="flex gap-1 ml-2 pl-3 border-l border-black/10">
                          <button 
                            onClick={() => denemeDuzenle(d)} 
                            className="text-gray-400 hover:text-blue-500 cursor-pointer p-1 transition-colors text-sm"
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => denemeSil(d.id)} 
                            className="text-gray-400 hover:text-red-500 cursor-pointer p-1 transition-colors text-sm"
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>

                    {d.eksikKonuListesi && d.eksikKonuListesi.length > 0 && (
                      <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 space-y-2">
                        <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Tespit Edilen Eksik Konular:</p>
                        <div className="flex flex-wrap gap-2">
                          {d.eksikKonuListesi.map((ek, idx) => (
                            <button
                              key={idx}
                              onClick={() => eksikKonuToggle(d.id, idx)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${ek.bitti ? 'bg-green-100 text-green-700 border-green-200 line-through' : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'}`}
                            >
                              {ek.bitti ? '✓ ' : '⏳ '}{ek.ad}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {denemeler.length === 0 && (
                <p className="text-xs text-gray-400 font-light text-center py-6">Henüz kaydedilmiş deneme sınavı yok.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB: POMODORO SİSTEMİ */}
      {aktifTab === 'Pomodoro' && (
        <div className="space-y-6 animate-fade-in flex flex-col items-center justify-center py-10">
          
          <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] shadow-sm border border-black/5 flex flex-col items-center max-w-md w-full relative overflow-hidden">
            {/* Arka plan süsü */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${pomoMod === 'calisiyor' ? 'bg-red-500' : pomoMod === 'mola' ? 'bg-green-500' : 'bg-blue-500'}`}></div>

            <div className="text-center space-y-2 mb-8 relative z-10">
              <h3 className="font-serif text-2xl text-gray-900">
                {pomoMod === 'bosta' || pomoMod === 'duraklatildi' ? 'Çalışma Vakti' : 
                 pomoMod === 'calisiyor' ? 'Odaklanma Devam Ediyor...' : 
                 pomoMod === 'mola' ? 'Mola Zamanı ☕' : 'Tebrikler! Mola Vakti 🎉'}
              </h3>
              <p className="text-xs text-gray-500 font-light">
                {pomoMod === 'bosta' ? '25 dakikalık odaklanma seansına başla.' : 
                 pomoMod === 'calisiyor' ? 'Dış etkenleri yoksay, sadece hedefine odaklan.' :
                 pomoMod === 'mola_bekliyor' ? 'Çalışma süren bitti, biraz ara vermelisin.' : 'Zihnini dinlendir, birazdan devam edeceğiz.'}
              </p>
            </div>

            {/* Sayaç */}
            <div className="relative mb-10 group z-10">
              <div className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center border-[8px] transition-all duration-500 shadow-inner bg-white ${
                pomoMod === 'calisiyor' ? 'border-red-400 text-red-500' : 
                pomoMod === 'mola' ? 'border-green-400 text-green-500' : 
                'border-gray-200 text-gray-700'
              }`}>
                <span className="text-5xl sm:text-6xl font-mono font-bold tracking-tighter">
                  {formatZaman(pomoSure)}
                </span>
              </div>
            </div>

            {/* Kontroller */}
            <div className="flex flex-wrap gap-3 justify-center z-10">
              {pomoMod === 'mola_bekliyor' ? (
                <button 
                  onClick={startMola} 
                  className="px-8 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition shadow-md shadow-green-500/20 active:scale-95"
                >
                  ☕ Molayı Başlat (5 Dk)
                </button>
              ) : (
                <>
                  <button 
                    onClick={togglePomodoro} 
                    className={`px-10 py-4 rounded-2xl font-bold transition shadow-md active:scale-95 text-sm ${
                      pomoMod === 'calisiyor' 
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                        : 'bg-gray-900 text-white hover:bg-black shadow-black/10'
                    }`}
                  >
                    {pomoMod === 'calisiyor' ? '⏸ Duraklat' : pomoMod === 'duraklatildi' ? '▶ Devam Et' : '▶ Başlat'}
                  </button>
                  
                  {(pomoMod === 'duraklatildi' || (pomoMod === 'bosta' && pomoSure !== 25 * 60) || pomoMod === 'mola') && (
                    <button 
                      onClick={resetPomodoro} 
                      className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition active:scale-95 text-sm"
                    >
                      🔄 Sıfırla
                    </button>
                  )}
                </>
              )}
            </div>

            {/* İstatistik */}
            <div className="mt-8 pt-6 border-t border-black/5 w-full text-center z-10 flex flex-col items-center">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Bugünkü Tamamlanan</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍅</span>
                <span className="text-3xl font-bold text-gray-800">x {tamamlananPomo}</span>
              </div>
              <button 
                onClick={() => {
                  if(window.confirm('Tamamlanan pomodoro sayısını sıfırlamak istiyor musunuz?')) {
                    setTamamlananPomo(0);
                    localStorage.setItem('lifeos_pomo_sayisi', 0);
                  }
                }}
                className="mt-4 text-[10px] text-gray-400 hover:text-red-500 underline decoration-dotted transition"
              >
                Sayacı Sıfırla
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}