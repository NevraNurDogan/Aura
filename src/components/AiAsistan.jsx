import { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

export default function AiAsistan({ setAktifSayfa }) {
  const [acik, setAcik] = useState(false);
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('lifeos_gemini_key') || '');
  const [inputApiKey, setInputApiKey] = useState(geminiApiKey);

  const [mesajlar, setMesajlar] = useState([
    {
      id: 1,
      gonderen: 'bot',
      metin: 'Merhaba! Ben senin kişisel yapay zeka asistanın Aura. ✨\n\nBenimle dilediğin gibi sohbet edebilir, film/Kdrama tavsiyesi isteyebilir, cilt bakımını günlerine göre ekletebilir ya da günlük işlerini planlatabilirsin!\n\nSeni dinliyorum, ne yapmak istersin?',
      zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tip: 'normal'
    }
  ]);

  const [inputMetin, setInputMetin] = useState('');
  const [yaziyor, setYaziyor] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Pencere açıldığında klavye odaklanması (focus)
  useEffect(() => {
    if (acik && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [acik]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mesajlar, yaziyor]);

  // CANLI İNTERNET/API DİZİ & FİLM & KDRAMA ARAMA MOTORU
  const canliMedyaArama = async (sorgu, varsayilanTur = 'Dizi') => {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(sorgu)}&limit=4`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.map(item => {
            const rawImg = item.artworkUrl100 || item.artworkUrl60 || '';
            const gorselUrl = rawImg ? rawImg.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb') : '';
            return {
              ad: item.trackName || item.collectionName || item.artistName || sorgu,
              tur: item.kind === 'feature-movie' ? 'Film' : varsayilanTur,
              kategoriDetay: `${item.artistName || 'Yapım'} • ${item.primaryGenreName || 'Genel'}`,
              puan: '8.5',
              gorselUrl: gorselUrl,
              aciklama: `${item.primaryGenreName || 'Medya'} türünde canlı arama sonucu.`
            };
          });
        }
      }
    } catch (e) {
      console.warn("iTunes arama hatası:", e);
    }
    return [];
  };

  // CANLI İNTERNET KİTAP ARAMA MOTORU
  const canliKitapArama = async (sorgu) => {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(sorgu)}&limit=3`);
      if (res.ok) {
        const data = await res.json();
        if (data.docs && data.docs.length > 0) {
          return data.docs.map(doc => ({
            ad: doc.title,
            tur: 'Kitap',
            kategoriDetay: `${doc.author_name ? doc.author_name.slice(0, 2).join(', ') : 'Yazar'} • Kitap`,
            puan: '8.8',
            gorselUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
            aciklama: 'Open Library canlı kütüphane araması.'
          }));
        }
      }
    } catch (e) {}
    return [];
  };

  // CİLT BAKIMI EKLENEN FİREBASE
  const ciltBakimUrunuEkleAPI = async (urunAdi, kategori = 'Serum', vakit = 'Her İkisi (Sabah & Akşam)', gunler = 'Her Gün') => {
    const userId = getCurrentUserId();
    const payload = {
      userId,
      urunAdi: urunAdi.trim(),
      kategori: kategori,
      vakit: vakit,
      gunler: gunler,
      tamamlandi: false,
      seri: 0,
      tamamlananTarihler: ''
    };

    try {
      if (userId) {
        await addDoc(collection(db, 'skincare'), payload);
      }
    } catch (e) {}

    return true;
  };

  // ALIŞKANLIK EKLEME
  const aliskanlikEkle = async (aliskanlikObj) => {
    const userId = getCurrentUserId();
    const baslik = aliskanlikObj.baslik || aliskanlikObj.ad || 'Yeni Alışkanlık';
    const kategori = aliskanlikObj.kategori || 'Genel';
    const payload = {
      userId,
      baslik: baslik,
      kategori: kategori,
      hedef: 'Her Gün',
      tamamlandi: false,
      seri: 0,
      tamamlananTarihler: ''
    };

    try {
      if (userId) {
        await addDoc(collection(db, 'habits'), payload);
      }
    } catch (e) {}

    return true;
  };

  // İZLEME LİSTESİNE DİZİ / FILM / KDRAMA EKLEME
  const filmEkle = async (filmObj) => {
    const userId = getCurrentUserId();
    const baslik = filmObj.ad || filmObj.baslik || 'Yeni Yapım';
    const tur = filmObj.tur || 'Dizi';
    const durum = filmObj.durum || (tur === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum');
    const kategoriDetay = filmObj.kategoriDetay || `${tur} • Eklenen`;

    const payload = {
      userId,
      baslik: baslik.trim(),
      tur: tur,
      durum: durum,
      kategoriDetay: kategoriDetay,
      puan: filmObj.puan ? Number(filmObj.puan) : 5,
      notlar: filmObj.aciklama || 'AI Asistan tarafından eklendi.',
      gorselUrl: filmObj.gorselUrl || ''
    };

    try {
      if (userId) {
        await addDoc(collection(db, 'media_archive'), payload);
      }
    } catch (e) {}

    return true;
  };

  // GÖREV EKLEME
  const gorevEkle = async (gorevMetin) => {
    const userId = getCurrentUserId();
    const payload = {
      userId,
      text: gorevMetin,
      durum: 'bekliyor',
      tarih: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    try {
      if (userId) {
        await addDoc(collection(db, 'tasks'), payload);
      }
      return true;
    } catch {
      return false;
    }
  };

  // TEFEKKÜR NOTU EKLEME
  const tefekkurNotuEkle = async (notMetin, kategori = 'Şükür') => {
    const tarihStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const yeniNot = {
      id: Date.now().toString(),
      baslik: 'AI Asistan Notu',
      icerik: notMetin,
      kategori: kategori,
      tarih: tarihStr
    };
    try {
      const mevcut = JSON.parse(localStorage.getItem('maneviyat_tefekkur_notlari')) || [];
      localStorage.setItem('maneviyat_tefekkur_notlari', JSON.stringify([yeniNot, ...mevcut]));
      return true;
    } catch {
      return false;
    }
  };

  // DOĞAL DİL ANLAMA VE PARAMETRE AYIKLAMA MOTORU (NLU)
  const nluKomutIsle = async (kullaniciMesaji) => {
    const m = kullaniciMesaji.toLowerCase().trim();

    // 1. CİLT BAKIMI EKLENMESİ (SABAH/AKŞAM VE GÜN PARAMETRELİ)
    if ((m.includes('ekle') || m.includes('kaydet')) && (m.includes('cilt') || m.includes('krem') || m.includes('serum') || m.includes('tonik') || m.includes('güneş') || m.includes('asit') || m.includes('jel') || m.includes('bakım'))) {
      let vakit = 'Her İkisi (Sabah & Akşam)';
      if (m.includes('sabah')) vakit = 'Sabah';
      else if (m.includes('akşam')) vakit = 'Akşam';

      let gunler = 'Her Gün';
      if (m.includes('pazartesi')) gunler = 'Pazartesi';
      if (m.includes('salı')) gunler = 'Salı';
      if (m.includes('çarşamba')) gunler = 'Çarşamba';
      if (m.includes('perşembe')) gunler = 'Perşembe';
      if (m.includes('cuma')) gunler = 'Cuma';
      if (m.includes('cumartesi')) gunler = 'Cumartesi';
      if (m.includes('pazar')) gunler = 'Pazar';
      if (m.includes('hafta sonu')) gunler = 'Hafta Sonu';
      if (m.includes('hafta içi')) gunler = 'Hafta İçi';

      let urunAdi = kullaniciMesaji
        .replace(/cilt bakımıma|cilt bakımına|cilt bakımı|ekle|kaydet|lütfen|ürününü|kremini|serumunu|toniğini|haftanın|günlerinde|sabahları|akşamları|sabah|akşam|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|günleri/gi, '')
        .trim();
      if (!urunAdi || urunAdi.length < 2) urunAdi = 'Nemlendirici Bakım Kremi';

      let kat = 'Serum';
      if (urunAdi.toLowerCase().includes('krem')) kat = 'Nemlendirici';
      if (urunAdi.toLowerCase().includes('tonik')) kat = 'Tonik';
      if (urunAdi.toLowerCase().includes('asit')) kat = 'Asit / Peeling';
      if (urunAdi.toLowerCase().includes('güneş')) kat = 'Güneş Kremi';
      if (urunAdi.toLowerCase().includes('jel') || urunAdi.toLowerCase().includes('temizle')) kat = 'Temizleme';

      await ciltBakimUrunuEkleAPI(urunAdi, kat, vakit, gunler);

      return {
        metin: `✨ **"${urunAdi}"** ürününü Cilt Bakımı rutinine başarıyla ekledim!\n\n📌 **Uygulama Vakti:** ${vakit}\n📌 **Günler:** ${gunler}\n📌 **Kategori:** ${kat}`,
        tip: 'aksiyon',
        sayfa: 'cilt',
        butonMetni: '✦ Cilt Bakımına Git'
      };
    }

    // 2. DİZİ / FİLM / KİTAP EKLENMESİ (DURUM PARAMETRELİ)
    if ((m.includes('ekle') || m.includes('kaydet')) && (m.includes('dizi') || m.includes('film') || m.includes('kdrama') || m.includes('izlemey') || m.includes('izle') || m.includes('izlenen') || m.includes('kitap'))) {
      let tur = 'Dizi';
      if (m.includes('film')) tur = 'Film';
      if (m.includes('kitap')) tur = 'Kitap';

      let durum = tur === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum';
      if (m.includes('izledim') || m.includes('bitti') || m.includes('okudum') || m.includes('bitirdim') || m.includes('izlenenlere')) {
        durum = tur === 'Kitap' ? 'Okudum / Bitti' : 'İzledim / Bitti';
      } else if (m.includes('devam') || m.includes('başladım') || m.includes('izliyorum') || m.includes('okuyorum')) {
        durum = tur === 'Kitap' ? 'Okuyorum' : 'Devam Ediyorum';
      }

      let ad = kullaniciMesaji
        .replace(/dizisini|filmini|kitabını|dizi|film|kitap|izledim|bitti|okudum|bitirdim|izlenenlere|izlenenler|izleme listeme|izleme arşivime|ekle|kaydet|lütfen/gi, '')
        .trim();
      if (!ad || ad.length < 2) ad = 'Yeni Yapım';

      let gorselUrl = '';
      let kategoriDetay = `${tur} • Eklenen`;
      if (tur === 'Kitap') {
        const kSonuc = await canliKitapArama(ad);
        if (kSonuc && kSonuc.length > 0) {
          gorselUrl = kSonuc[0].gorselUrl;
          kategoriDetay = kSonuc[0].kategoriDetay;
        }
      } else {
        const mSonuc = await canliMedyaArama(ad, tur);
        if (mSonuc && mSonuc.length > 0) {
          gorselUrl = mSonuc[0].gorselUrl;
          kategoriDetay = mSonuc[0].kategoriDetay;
        }
      }

      await filmEkle({ ad: ad, tur: tur, durum: durum, kategoriDetay: kategoriDetay, gorselUrl: gorselUrl });

      return {
        metin: `🎬 **"${ad}"** yapımını İzleme Ar arşivine kaydettim!\n\n📌 **Tür:** ${tur}\n📌 **Durum:** ${durum}`,
        tip: 'aksiyon',
        sayfa: 'izleme',
        butonMetni: '◈ İzleme Arşivine Git'
      };
    }

    // 3. GÖREV / YAPILACAK İŞ EKLENMESİ
    if ((m.includes('ekle') || m.includes('kaydet')) && (m.includes('görev') || m.includes('yapılacak') || m.includes('todo') || m.includes('randevu') || m.includes('iş'))) {
      let gorev = kullaniciMesaji.replace(/yapılacaklar listeme|görevlerime|görev|yapılacak|ekle|kaydet|lütfen|iş/gi, '').trim();
      if (!gorev) gorev = 'Yeni önemli görev';

      await gorevEkle(gorev);

      return {
        metin: `📌 **"${gorev}"** görevini Günlük Düzen listene ekledim!`,
        tip: 'aksiyon',
        sayfa: 'duzen',
        butonMetni: '⚡ Günlük Düzen\'e Git'
      };
    }

    // 4. ALIŞKANLIK EKLENMESİ
    if ((m.includes('ekle') || m.includes('kaydet')) && m.includes('alışkanlık')) {
      let baslik = kullaniciMesaji.replace(/alışkanlığı|alışkanlıklarıma|alışkanlık|ekle|kaydet|lütfen/gi, '').trim();
      if (!baslik) baslik = 'Yeni Alışkanlık';

      await aliskanlikEkle({ baslik: baslik, kategori: 'Kişisel' });

      return {
        metin: `⚡ **"${baslik}"** alışkanlığını Günlük Düzen rutinine ekledim!`,
        tip: 'aksiyon',
        sayfa: 'duzen',
        butonMetni: '⚡ Günlük Düzen\'e Git'
      };
    }

    // 5. TEFEKKÜR / MANEVİYAT NOTU EKLENMESİ
    if ((m.includes('ekle') || m.includes('kaydet')) && (m.includes('şükür') || m.includes('tefekkür') || m.includes('maneviyat') || m.includes('not'))) {
      let notMetin = kullaniciMesaji.replace(/tefekkür notu|şükür notu|maneviyat notu|not ekle|ekle|kaydet/gi, '').trim();
      if (!notMetin) notMetin = 'Bugün verdiğin tüm nimetler ve huzur için şükürler olsun.';

      await tefekkurNotuEkle(notMetin, m.includes('şükür') ? 'Şükür' : 'Tefekkür');

      return {
        metin: `🤲 Tefekkür ve Şükür notunu Maneviyat modülüne kaydettim.`,
        tip: 'aksiyon',
        sayfa: 'maneviyat',
        butonMetni: '☽ Maneviyat Notlarına Git'
      };
    }

    return null;
  };

  // GEMINI LLM API CALL
  const callGeminiLLM = async (key, promptHistory, userPrompt) => {
    try {
      const formattedHistory = promptHistory.slice(-8).map(m => ({
        role: m.gonderen === 'kullanici' ? 'user' : 'model',
        parts: [{ text: m.metin }]
      }));

      formattedHistory.push({ role: 'user', parts: [{ text: userPrompt }] });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const profilIsim = localStorage.getItem('lifeos_profil_isim') || 'Kullanıcı';
      const profilLevel = localStorage.getItem('lifeos_profil_level') || '1';
      const profilXp = localStorage.getItem('lifeos_profil_xp') || '0';

      const systemPrompt = `Sen 'Aura' adında son derece samimi, empati kurabilen, neşeli, kültürlü ve zeki bir kişisel yaşam koçu (life-coach) yapay zeka asistanısın. 
Karşındaki kişinin adı: ${profilIsim}. 
Şu anda Seviye ${profilLevel}'de ve ${profilXp} XP puanına sahip. 

Görevlerin:
1. Sadece soğuk bir yapay zeka gibi değil, yakın bir dost ve akıl hocası gibi konuş. 
2. Ara sıra seviyesine ve çabasına (XP) atıfta bulunarak onu motive et. ("Seviye 5'e çok az kalmış!", "Bugün de harika çalışıp XP'leri topluyorsun!" vb.)
3. Gerektiğinde esprili, gerektiğinde ise ciddi ve destekleyici ol.
4. Yanıtlarını Türkçe, doğal, kısa ve okuması kolay (maddeleme veya emojiler kullanarak) ver. Çok uzun paragraflardan kaçın.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: formattedHistory
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      }
    } catch (err) {}
    return null;
  };

  // ANINDA SOHBET & SELAMLAŞMA MOTORU (NEVER HANGS / ASLA ASKIDA KALMAZ)
  const uretAnindaCevap = (metin) => {
    const m = metin.toLowerCase().trim();

    // Selamlaşma & Hal Hatır
    if (m === 'hii' || m === 'hi' || m === 'hello' || m === 'hey') {
      return 'Harikayım, merhaba! 😊 Sen nasılsın, günün nasıl geçiyor? Senin için bugün ne yapabiliriz?';
    }
    if (m.includes('naber') || m.includes('ne haber') || m.includes('nasılsın') || m.includes('nasıl gidiyor')) {
      return 'Çok iyiyim, sorduğun için çok teşekkür ederim! ✨ Senin modun nasıl bugün? Dertleşmek ya da bir şeyler planlamak ister misin?';
    }
    if (m.includes('selam') || m.includes('merhaba') || m.includes('günaydın') || m.includes('iyi akşamlar')) {
      return 'Selam! 🌸 Hoş geldin! Sana bugün nasıl yardımcı olabilirim?';
    }
    if (m.includes('kimsin') || m.includes('sen kimsin')) {
      return 'Ben Aura! Life OS kişisel yapay zeka asistanınım. ✦\n\nSeninle sohbet edebilir, film/Kdrama tavsiyeleri getirebilir, cilt bakımını ve günlük görevlerini planlayabilirim!';
    }
    if (m.includes('teşekkür') || m.includes('sağol') || m.includes('eyvallah') || m.includes('teşekkürler')) {
      return 'Rica ederim, ne demek! 😊 Her zaman buradayım!';
    }

    return null;
  };

  // MESAJ GÖNDERME HANDLE (TAM GÜVENLİ TRY-FINALLY PIPELINE)
  const gonder = async (metinOverride) => {
    const metin = metinOverride || inputMetin;
    if (!metin.trim()) return;

    const simdi = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yeniKullaniciMesaj = {
      id: Date.now(),
      gonderen: 'kullanici',
      metin: metin,
      zaman: simdi,
      tip: 'normal'
    };

    setMesajlar(prev => [...prev, yeniKullaniciMesaj]);
    if (!metinOverride) setInputMetin('');
    setYaziyor(true);

    try {
      // 1. Önce gelişmiş NLU komut kontrolü yap (Parametreli Ekleme)
      const nluSonucu = await nluKomutIsle(metin);
      if (nluSonucu) {
        setMesajlar(prev => [...prev, {
          id: Date.now(),
          gonderen: 'bot',
          metin: nluSonucu.metin,
          zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tip: nluSonucu.tip,
          sayfa: nluSonucu.sayfa,
          butonMetni: nluSonucu.butonMetni
        }]);
        return;
      }

      // 2. Anında Sohbet & Selamlaşma Yanıtı (Hii / Naber / Selam)
      const anindaCevap = uretAnindaCevap(metin);
      if (anindaCevap) {
        setMesajlar(prev => [...prev, {
          id: Date.now(),
          gonderen: 'bot',
          metin: anindaCevap,
          zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tip: 'normal'
        }]);
        return;
      }

      // 3. Gemini API Key varsa Gemini çağır
      let botCevabiMetni = null;
      if (geminiApiKey.trim()) {
        botCevabiMetni = await callGeminiLLM(geminiApiKey.trim(), mesajlar, metin);
      }

      if (botCevabiMetni) {
        setMesajlar(prev => [...prev, {
          id: Date.now(),
          gonderen: 'bot',
          metin: botCevabiMetni,
          zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tip: 'normal'
        }]);
        return;
      }

      // 4. Canlı İnternet Medya / Kitap Araması
      const mLower = metin.toLowerCase();
      let canliSonuc = [];

      if (mLower.includes('kdrama') || mLower.includes('k-drama') || mLower.includes('kore dizisi') || mLower.includes('kore')) {
        canliSonuc = await canliMedyaArama(metin.replace(/öner|tavsiye|bana|edermisin|misin/gi, '').trim() || 'Korean Drama', 'Dizi');
      } else if (mLower.includes('film') || mLower.includes('dizi') || mLower.includes('izle') || mLower.includes('sinema')) {
        canliSonuc = await canliMedyaArama(metin.replace(/öner|tavsiye|bana|edermisin|misin/gi, '').trim() || 'Popular Movies', 'Film');
      } else if (mLower.includes('kitap')) {
        canliSonuc = await canliKitapArama(metin.replace(/öner|tavsiye|bana|edermisin|misin/gi, '').trim() || 'Best Sellers');
      }

      if (canliSonuc && canliSonuc.length > 0) {
        setMesajlar(prev => [...prev, {
          id: Date.now(),
          gonderen: 'bot',
          metin: `Sorgun için canlı kütüphane ve medya veritabanından çekilen gerçek öneriler: 🎬\n\nBeğendiğin içeriği tek tıkla doğrudan arşivine ekleyebilirsin!`,
          zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tip: 'oneriler_film',
          liste: canliSonuc
        }]);
      } else {
        setMesajlar(prev => [...prev, {
          id: Date.now(),
          gonderen: 'bot',
          metin: `Seni dinliyorum! 😊\n\nBana aklına gelen her türlü konuyu yazabilirsin. Senin için ne yapmamı istersin?`,
          zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tip: 'normal'
        }]);
      }
    } catch (err) {
      console.error("Gonder hatası:", err);
    } finally {
      setYaziyor(false);
    }
  };

  const sohbetiTemizle = () => {
    setMesajlar([
      {
        id: Date.now(),
        gonderen: 'bot',
        metin: 'Sohbet geçmişi temizlendi. ✨ Bana istediğin soruyu sorabilirsin!',
        zaman: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tip: 'normal'
      }
    ]);
  };

  const apiKeyKaydet = () => {
    localStorage.setItem('lifeos_gemini_key', inputApiKey.trim());
    setGeminiApiKey(inputApiKey.trim());
    setApiKeyModal(false);
  };

  return (
    <>
      {/* 1. YÜZEN ASİSTAN BUTONU */}
      <button
        onClick={() => setAcik(!acik)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-tr from-slate-900 via-gray-900 to-slate-800 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-white/20 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Aura AI Sohbet Asistanı"
      >
        <div className="w-8 h-8 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-serif animate-pulse group-hover:rotate-12 transition">
          ✦
        </div>
        <div className="hidden sm:flex flex-col text-left pr-1">
          <span className="text-xs font-serif font-bold text-white leading-tight">Aura Asistan</span>
          <span className="text-[10px] text-emerald-400 font-sans font-semibold">Canlı Yapay Zeka</span>
        </div>
      </button>

      {/* 2. AÇILIR CHAT PENCERESİ */}
      {acik && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[560px] max-h-[82vh] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* HEADER */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-serif font-bold text-xl flex items-center justify-center shadow-md">
                ✦
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white leading-snug">Aura AI Asistanı</h3>
                <p className="text-[10px] text-emerald-400 font-medium">Anında Canlı Yanıt & Komut Motoru</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={sohbetiTemizle}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
                title="Sohbeti Sıfırla"
              >
                🗑️
              </button>
              <button
                onClick={() => setApiKeyModal(true)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer flex items-center gap-1"
                title="AI Ayarları"
              >
                <span>⚙️</span>
              </button>
              <button
                onClick={() => setAcik(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* SOHBET AKIŞI */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
            {mesajlar.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.gonderen === 'kullanici' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.gonderen === 'kullanici'
                      ? 'bg-slate-900 text-white rounded-tr-none shadow-xs font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line font-sans">{m.metin}</p>

                  {/* AKSIYON BUTONU */}
                  {m.tip === 'aksiyon' && m.sayfa && (
                    <button
                      onClick={() => { setAktifSayfa(m.sayfa); setAcik(false); }}
                      className="mt-3 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>{m.butonMetni || 'Görüntüle'}</span>
                    </button>
                  )}

                  {/* CANLI MEDYA/FİLM/KDRAMA KARTLARI */}
                  {m.tip === 'oneriler_film' && m.liste && (
                    <div className="mt-3 space-y-2">
                      {m.liste.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left space-y-1.5 flex gap-2.5 items-start">
                          {item.gorselUrl && (
                            <img src={item.gorselUrl} alt={item.ad} className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 text-xs truncate">{item.ad}</span>
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded shrink-0">★ {item.puan}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{item.kategoriDetay}</p>
                            <button
                              onClick={async () => {
                                await filmEkle({ baslik: item.ad, tur: item.tur || 'Dizi', durum: 'İzlemek İstiyorum', kategoriDetay: item.kategoriDetay, gorselUrl: item.gorselUrl });
                                gonder(`"${item.ad}" yapımını İzleme Arşivi listeme ekledim.`);
                              }}
                              className="mt-1.5 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shadow-2xs"
                            >
                              🎬 İzleme Arşivime Ekle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-slate-400 font-medium mt-1 px-1">{m.zaman}</span>
              </div>
            ))}

            {yaziyor && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-white p-3 rounded-2xl w-28 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Düşünüyor...</span>
              </div>
            )}
          </div>

          {/* SOHBET INPUT */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 relative z-50">
            <input
              ref={inputRef}
              type="text"
              value={inputMetin}
              onChange={(e) => setInputMetin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && gonder()}
              placeholder="Mesajınızı yazın (Örn: Niacinamide Salı sabahı ekle)..."
              className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition font-medium"
              style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}
            />

            <button
              onClick={() => gonder()}
              className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-bold flex items-center justify-center text-sm shadow-md transition cursor-pointer active:scale-95 shrink-0"
            >
              ↑
            </button>
          </div>

        </div>
      )}

      {/* GEMINI API KEY MODALI */}
      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-serif font-bold text-slate-900">🔑 AI Ayarları</h3>
              <button onClick={() => setApiKeyModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Asistanınız dahili Türkçe Yapay Zeka & Canlı İnternet Arama Motoru ile anında yanıt verir. Dilerseniz kendi Google Gemini API anahtarınızı da ekleyebilirsiniz.
            </p>
            <input
              type="text"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              placeholder="Opsiyonel: AIzaSy..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              style={{ color: '#0f172a', backgroundColor: '#f8fafc' }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setApiKeyModal(false)} className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 cursor-pointer">Kapat</button>
              <button onClick={apiKeyKaydet} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black cursor-pointer shadow-xs">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
