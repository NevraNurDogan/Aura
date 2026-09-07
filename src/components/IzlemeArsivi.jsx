import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

const VARSAYILAN_ARSIV = [];

export default function IzlemeArsivi() {
  const [arsiv, setArsiv] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aktifSekme, setAktifSekme] = useState('Dizi');
  const [durumFiltresi, setDurumFiltresi] = useState('Tümü');
  const [formGoster, setFormGoster] = useState(false);
  const [otomatikAramaYukleniyor, setOtomatikAramaYukleniyor] = useState(false);
  const [aramaSonucuMesaj, setAramaSonucuMesaj] = useState('');
  
  // DÜZENLEME MODU İÇİN YENİ STATE
  const [duzenlenenId, setDuzenlenenId] = useState(null);

  const [formData, setFormData] = useState({
    baslik: '',
    tur: 'Dizi',
    durum: '',
    kategoriDetay: '',
    puan: 0,
    notlar: '',
    gorselUrl: ''
  });

  // ÇOKLU API KAPSAMLI KAPAK VE BİLGİ BULMA MOTORU
  const detaylariVeGorseliOtomatikBul = async (baslik, tur) => {
    if (!baslik.trim()) return null;

    let gorselUrl = '';
    let yazarVeyaYonetmen = '';
    let kategori = '';

    if (tur === 'Kitap') {
      try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(baslik)}&printType=books&maxResults=3`);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.items && gData.items.length > 0) {
            const info = gData.items[0].volumeInfo;
            if (info.authors && info.authors.length > 0) yazarVeyaYonetmen = info.authors.join(', ');
            if (info.categories && info.categories.length > 0) kategori = info.categories.join(' / ');
            if (info.imageLinks) {
              const rawImg = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || info.imageLinks.medium || '';
              gorselUrl = rawImg.replace('http:', 'https:').replace('&edge=curl', '');
            }
          }
        }
      } catch (e) { console.warn("Google Books API hatası:", e); }

      if (!gorselUrl || !yazarVeyaYonetmen) {
        try {
          const olRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(baslik)}&limit=1`);
          if (olRes.ok) {
            const olData = await olRes.json();
            if (olData.docs && olData.docs.length > 0) {
              const doc = olData.docs[0];
              if (!yazarVeyaYonetmen && doc.author_name) yazarVeyaYonetmen = doc.author_name.slice(0, 2).join(', ');
              if (!gorselUrl && doc.cover_i) gorselUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }
          }
        } catch (e) { console.warn("Open Library hatası:", e); }
      }
    }

    if (tur === 'Dizi') {
      try {
        const tvRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(baslik)}`);
        if (tvRes.ok) {
          const tvData = await tvRes.json();
          if (tvData.genres && tvData.genres.length > 0) kategori = tvData.genres.join(' / ');
          if (tvData.network && tvData.network.name) yazarVeyaYonetmen = tvData.network.name;
          else if (tvData.webChannel && tvData.webChannel.name) yazarVeyaYonetmen = tvData.webChannel.name;
          
          if (tvData.image && (tvData.image.original || tvData.image.medium)) {
            gorselUrl = tvData.image.original || tvData.image.medium;
          }
        }
      } catch (e) { console.warn("TVMaze hatası:", e); }

      if (!gorselUrl) {
        try {
          const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(baslik)}&media=tvShow&limit=3`);
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const match = itunesData.results[0];
              if (!yazarVeyaYonetmen && match.artistName) yazarVeyaYonetmen = match.artistName;
              if (!kategori && match.primaryGenreName) kategori = match.primaryGenreName;
              if (match.artworkUrl100) gorselUrl = match.artworkUrl100.replace('100x100bb', '600x600bb');
            }
          }
        } catch (e) { console.warn("iTunes Dizi API hatası:", e); }
      }
    }

    if (tur === 'Film') {
      try {
        const omdbRes = await fetch(`https://www.omdbapi.com/?apikey=trilogy&t=${encodeURIComponent(baslik)}`);
        const omdbData = await omdbRes.json();
        
        if (omdbData.Response === "True") {
          if (omdbData.Director && omdbData.Director !== "N/A") yazarVeyaYonetmen = omdbData.Director;
          if (omdbData.Genre && omdbData.Genre !== "N/A") kategori = omdbData.Genre;
          if (omdbData.Poster && omdbData.Poster !== "N/A") gorselUrl = omdbData.Poster;
        }
      } catch (e) { console.warn("OMDB Film API hatası:", e); }
    }

    let birlesikDetay = '';
    if (yazarVeyaYonetmen && kategori) birlesikDetay = `${yazarVeyaYonetmen} • ${kategori}`;
    else if (yazarVeyaYonetmen) birlesikDetay = yazarVeyaYonetmen;
    else if (kategori) birlesikDetay = kategori;

    return { gorselUrl, kategoriDetay: birlesikDetay, yazarVeyaYonetmen, kategori };
  };

  const otomatikDoldur = async () => {
    if (!formData.baslik.trim()) {
      setAramaSonucuMesaj("⚠️ Lütfen önce bir kitap, film veya dizi adı giriniz.");
      return;
    }

    setOtomatikAramaYukleniyor(true);
    setAramaSonucuMesaj(`🔎 İnternetten ${aktifSekme.toLowerCase()} detayları aranıyor...`);

    const sonuc = await detaylariVeGorseliOtomatikBul(formData.baslik, aktifSekme);

    if (sonuc && (sonuc.gorselUrl || sonuc.kategoriDetay)) {
      setFormData(prev => ({
        ...prev,
        gorselUrl: sonuc.gorselUrl || prev.gorselUrl,
        kategoriDetay: sonuc.kategoriDetay || prev.kategoriDetay
      }));
      setAramaSonucuMesaj("✨ Kapak resmi ve detay bilgileri otomatik yerleştirildi!");
    } else {
      setAramaSonucuMesaj("ℹ️ Özel arama tamamlandı. Görsel bağlantısını kendiniz de ekleyebilirsiniz.");
    }
    setOtomatikAramaYukleniyor(false);
  };

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    let hamData = [];
    try {
      const q = query(collection(db, 'media_archive'), where('userId', '==', userId));
      const snap = await getDocs(q);
      hamData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.warn("Firebase arşivi çekilemedi."); }

    setArsiv(hamData);
    localStorage.setItem('lifeos_izlemearsivleri_cache', JSON.stringify(hamData));
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const arsivKaydetLocal = (yeniArsiv) => {
    setArsiv(yeniArsiv);
    localStorage.setItem('lifeos_izlemearsivleri_cache', JSON.stringify(yeniArsiv));
  };

  const sekmeDegis = (yeniSekme) => {
    setAktifSekme(yeniSekme);
    setDurumFiltresi('Tümü');
    formuSifirla();
  };

  // YENİ KAYIT VE GÜNCELLEME İŞLEMİ (BİRLEŞTİRİLDİ)
  const kaydet = async () => {
    if (!formData.baslik.trim()) {
      alert("Lütfen başlık/isim giriniz.");
      return;
    }

    let gorselUrl = formData.gorselUrl;
    let kategoriDetay = formData.kategoriDetay;

    if (!gorselUrl || !kategoriDetay) {
      const sonuc = await detaylariVeGorseliOtomatikBul(formData.baslik.trim(), aktifSekme);
      if (sonuc) {
        if (!gorselUrl && sonuc.gorselUrl) gorselUrl = sonuc.gorselUrl;
        if (!kategoriDetay && sonuc.kategoriDetay) kategoriDetay = sonuc.kategoriDetay;
      }
    }

    let varsayilanDurum = formData.durum;
    if (!varsayilanDurum) {
      varsayilanDurum = aktifSekme === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum';
    }

    const kayitVerisi = {
      userId,
      baslik: formData.baslik.trim(),
      tur: aktifSekme,
      durum: varsayilanDurum,
      kategoriDetay: kategoriDetay.trim() || '-',
      puan: formData.puan || 0,
      notlar: formData.notlar.trim() || '',
      gorselUrl: gorselUrl || ''
    };

    if (duzenlenenId) {
      // DÜZENLEME (GÜNCELLEME) İŞLEMİ
      try {
        await setDoc(doc(db, 'media_archive', duzenlenenId.toString()), kayitVerisi, { merge: true });
        const yeniArsiv = arsiv.map(i => i.id === duzenlenenId ? { ...kayitVerisi, id: duzenlenenId } : i);
        arsivKaydetLocal(yeniArsiv);
      } catch (error) { console.warn("Güncellenemedi."); }
    } else {
      // YENİ EKLEME İŞLEMİ
      try {
        const docRef = await addDoc(collection(db, 'media_archive'), kayitVerisi);
        const yeniArsiv = [{ ...kayitVerisi, id: docRef.id }, ...arsiv];
        arsivKaydetLocal(yeniArsiv);
      } catch (error) { console.warn("Kaydedilemedi."); }
    }

    formuSifirla();
  };

  // DÜZENLEME BUTONUNA TIKLANINCA ÇALIŞAN FONKSİYON
  const duzenle = (item) => {
    setAktifSekme(item.tur || 'Dizi');
    setFormData({
      baslik: item.baslik || '',
      tur: item.tur || 'Dizi',
      durum: item.durum || '',
      kategoriDetay: item.kategoriDetay || '',
      puan: item.puan || 0,
      notlar: item.notlar || '',
      gorselUrl: item.gorselUrl || ''
    });
    setDuzenlenenId(item.id);
    setFormGoster(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Ekranı yavaşça forma kaydırır
  };

  const alanGuncelle = async (item, yeniAlanlar) => {
    const guncelItem = { ...item, ...yeniAlanlar };
    const yeniArsiv = arsiv.map(i => i.id === item.id ? guncelItem : i);
    arsivKaydetLocal(yeniArsiv);

    try {
      await updateDoc(doc(db, 'media_archive', item.id.toString()), yeniAlanlar);
    } catch (error) { console.warn("Firebase güncelleme başarısız."); }
  };

  const sil = async (id) => {
    if (window.confirm('Bu içeriği arşivden silmek istediğine emin misin?')) {
      const yeniArsiv = arsiv.filter(i => i.id !== id);
      arsivKaydetLocal(yeniArsiv);
      try {
        await deleteDoc(doc(db, 'media_archive', id.toString()));
      } catch (error) { console.warn("Firebase silme başarısız."); }
    }
  };

  const formuSifirla = () => {
    setFormData({ baslik: '', tur: 'Dizi', durum: '', kategoriDetay: '', puan: 0, notlar: '', gorselUrl: '' });
    setDuzenlenenId(null);
    setFormGoster(false);
    setAramaSonucuMesaj('');
  };

  const sekmeIcerikleri = arsiv.filter(item => (item.tur || '').toLowerCase() === aktifSekme.toLowerCase());
  
  const toplamSayi = sekmeIcerikleri.length;
  const bittiSayisi = sekmeIcerikleri.filter(i => (i.durum || '').includes('Bitti') || (i.durum || '').includes('Okudum')).length;
  const devamSayisi = sekmeIcerikleri.filter(i => (i.durum || '').includes('Devam') || (i.durum || '').includes('Okuyorum')).length;

  const filtrelenmisListe = sekmeIcerikleri.filter(item => {
    const aramaUyumu = (item.baslik || '').toLowerCase().includes(aramaMetni.toLowerCase()) || 
                      (item.kategoriDetay || '').toLowerCase().includes(aramaMetni.toLowerCase()) ||
                      (item.notlar || '').toLowerCase().includes(aramaMetni.toLowerCase());
    
    if (durumFiltresi === 'İstiyorum') return aramaUyumu && (item.durum || '').includes('İstiyorum');
    if (durumFiltresi === 'Devam') return aramaUyumu && ((item.durum || '').includes('Devam') || (item.durum || '').includes('Okuyorum'));
    if (durumFiltresi === 'Bitti') return aramaUyumu && ((item.durum || '').includes('Bitti') || (item.durum || '').includes('Okudum'));
    return aramaUyumu;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal">İzleme & Okuma Arşivi</h2>
          <p className="text-xs text-gray-400 font-light">Canlı kapak resmi ve detay arama motorlu kişisel medya kütüphaneniz.</p>
        </div>
        {!formGoster && (
          <button 
            onClick={() => setFormGoster(true)} 
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs sm:text-sm font-medium hover:bg-black transition cursor-pointer shadow-xs self-end sm:self-auto"
          >
            + Yeni Ekle
          </button>
        )}
      </div>

      {/* İSTATİSTİK KUTULARI */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-black/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Toplam</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-gray-800 mt-0.5">{toplamSayi}</p>
          </div>
          <span className="text-lg font-serif text-gray-400">◈</span>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-black/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Devam</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-blue-600 mt-0.5">{devamSayisi}</p>
          </div>
          <span className="text-lg font-serif text-blue-500">⚡</span>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-black/5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider font-semibold">Biten</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-green-600 mt-0.5">{bittiSayisi}</p>
          </div>
          <span className="text-lg font-serif text-green-500">✓</span>
        </div>
      </div>

      {/* SEKME GEÇİŞLERİ */}
      <div className="flex gap-2 border-b border-black/5 pb-3 overflow-x-auto custom-scrollbar">
        {['Dizi', 'Film', 'Kitap'].map(sekme => (
          <button
            key={sekme}
            onClick={() => sekmeDegis(sekme)}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${aktifSekme === sekme ? 'bg-gray-900 text-white shadow-xs' : 'bg-white/80 text-gray-600 border border-black/5 hover:bg-white'}`}
          >
            {sekme === 'Dizi' ? '📺 Diziler' : sekme === 'Film' ? '🎬 Filmler' : '📚 Kitaplar'}
          </button>
        ))}
      </div>

      {/* ARAMA VE DURUM FİLTRELERİ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          placeholder={`${aktifSekme} arşivinde ara...`}
          value={aramaMetni}
          onChange={(e) => setAramaMetni(e.target.value)}
          className="flex-1 p-3 bg-white/80 border border-black/5 rounded-2xl text-gray-700 shadow-xs focus:outline-none focus:border-blue-400 text-xs sm:text-sm"
        />
        <div className="flex gap-1 bg-white/80 p-1 rounded-2xl border border-black/5 shadow-xs overflow-x-auto custom-scrollbar">
          {['Tümü', 'İstiyorum', 'Devam', 'Bitti'].map(filt => (
            <button
              key={filt}
              onClick={() => setDurumFiltresi(filt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${durumFiltresi === filt ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {filt}
            </button>
          ))}
        </div>
      </div>

      {/* FORM: AKILLI OTOMATİK TAMAMLAYICI İLE */}
      {formGoster && (
        <div className="bg-white/95 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-md border border-black/5 flex flex-col gap-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-black/5 pb-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                {duzenlenenId ? `Mevcut ${aktifSekme} Kaydını Düzenle` : `Yeni ${aktifSekme} Ekle`}
              </h3>
              <p className="text-[11px] text-gray-400 font-light">İsmini yazıp "✨ Otomatik Doldur" butonuna bastığınızda kapak resmi, yazar/yönetmen ve tür bilgileri internetten çekilir.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder={`${aktifSekme} Adı (Örn: ${aktifSekme === 'Kitap' ? 'Kürk Mantolu Madonna' : aktifSekme === 'Film' ? 'Interstellar' : 'Succession'})`}
              value={formData.baslik} 
              onChange={(e) => setFormData({...formData, baslik: e.target.value})}
              className="flex-1 p-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:outline-none focus:border-blue-400 text-xs sm:text-sm font-medium"
            />
            <button
              type="button"
              onClick={otomatikDoldur}
              disabled={otomatikAramaYukleniyor}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition cursor-pointer whitespace-nowrap shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>{otomatikAramaYukleniyor ? '⌛' : '✨'}</span>
              <span>Otomatik Doldur (Kapak, Yazar, Tür)</span>
            </button>
          </div>

          {aramaSonucuMesaj && (
            <p className="text-xs font-medium text-blue-600 bg-blue-50 p-2.5 rounded-xl border border-blue-100 animate-fade-in">
              {aramaSonucuMesaj}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                {aktifSekme === 'Kitap' ? 'Yazar & Tür Bilgisi' : 'Yönetmen/Yapımcı & Tür'}
              </label>
              <input 
                type="text" 
                placeholder={aktifSekme === 'Kitap' ? 'Örn: Sabahattin Ali • Roman' : 'Örn: Christopher Nolan • Bilim Kurgu'}
                value={formData.kategoriDetay} 
                onChange={(e) => setFormData({...formData, kategoriDetay: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:outline-none text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Durum Seçimi</label>
              <select 
                value={formData.durum} 
                onChange={(e) => setFormData({...formData, durum: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:outline-none text-xs sm:text-sm font-medium"
              >
                <option value="">{aktifSekme === 'Kitap' ? 'Okumak İstiyorum (Varsayılan)' : 'İzlemek İstiyorum (Varsayılan)'}</option>
                <option value={aktifSekme === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum'}>
                  {aktifSekme === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum'}
                </option>
                <option value={aktifSekme === 'Kitap' ? 'Okuyorum' : 'Devam Ediyorum'}>
                  {aktifSekme === 'Kitap' ? 'Okuyorum' : 'Devam Ediyorum'}
                </option>
                <option value={aktifSekme === 'Kitap' ? 'Okudum / Bitti' : 'İzledim / Bitti'}>
                  {aktifSekme === 'Kitap' ? 'Okudum / Bitti' : 'İzledim / Bitti'}
                </option>
                <option value="Yarım Bıraktım">Yarım Bıraktım</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Kapak Görseli URL</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Kapak resmi internetten otomatik çekilir veya yapıştırabilirsiniz"
                  value={formData.gorselUrl}
                  onChange={(e) => setFormData({...formData, gorselUrl: e.target.value})}
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:outline-none text-xs"
                />
                {formData.gorselUrl && (
                  <img 
                    src={formData.gorselUrl} 
                    alt="Kapak Önizleme" 
                    className="w-10 h-10 object-cover rounded-xl border border-gray-300 shrink-0 shadow-xs"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Puanınız</label>
              <div className="flex items-center justify-between p-2.5 border border-gray-200 rounded-xl bg-gray-50 h-[42px]">
                <span className="text-xs font-semibold text-gray-500">Değerlendirme:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({...formData, puan: star})}
                      className={`text-lg cursor-pointer transition-transform hover:scale-125 ${formData.puan >= star ? 'text-amber-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <textarea
            placeholder="Kişisel düşünceler, alıntılar veya notlar..."
            value={formData.notlar}
            onChange={(e) => setFormData({...formData, notlar: e.target.value})}
            className="p-3 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 focus:outline-none text-xs sm:text-sm resize-none h-16"
          ></textarea>

          <div className="flex justify-end gap-2 mt-1">
            <button type="button" onClick={formuSifirla} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer text-xs transition-colors">İptal</button>
            <button type="button" onClick={kaydet} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-black cursor-pointer text-xs shadow-xs transition-all">
              {duzenlenenId ? 'Değişiklikleri Kaydet' : 'Kaydet & Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* AFİŞLİ KART LİSTESİ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrelenmisListe.map((item) => (
          <div 
            key={item.id} 
            className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xs border border-black/5 flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 group"
          >
            <div className="relative h-56 bg-slate-900 overflow-hidden">
              {item.gorselUrl ? (
                <img 
                  src={item.gorselUrl} 
                  alt={item.baslik} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
                  <span className="text-4xl mb-2">{item.tur === 'Dizi' ? '📺' : item.tur === 'Film' ? '🎬' : '📚'}</span>
                  <span className="text-sm font-bold">{item.baslik}</span>
                  <span className="text-[10px] text-gray-400 mt-1">{item.kategoriDetay}</span>
                </div>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${
                  (item.durum || '').includes('Bitti') || (item.durum || '').includes('Okudum')
                    ? 'bg-green-500/90 text-white' 
                    : (item.durum || '').includes('İstiyorum') 
                    ? 'bg-blue-500/90 text-white' 
                    : (item.durum || '').includes('Devam') || (item.durum || '').includes('Okuyorum')
                    ? 'bg-purple-500/90 text-white'
                    : 'bg-orange-500/90 text-white'
                }`}>
                  {item.durum}
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="text-gray-900 font-bold text-base leading-snug">{item.baslik}</h3>
                  {item.puan > 0 && (
                    <div className="flex text-amber-400 text-xs shrink-0 mt-0.5">
                      {Array.from({ length: item.puan }).map((_, i) => <span key={i}>★</span>)}
                    </div>
                  )}
                </div>

                <p className="text-gray-500 text-xs font-medium">{item.kategoriDetay}</p>

                {item.notlar && (
                  <p className="text-gray-600 text-xs bg-gray-50/80 p-2.5 rounded-xl border border-black/5 mt-2.5 italic font-light line-clamp-3">
                    "{item.notlar}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <select
                  value={item.durum}
                  onChange={(e) => alanGuncelle(item, { durum: e.target.value })}
                  className="text-xs font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer w-32"
                >
                  <option value={aktifSekme === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum'}>
                    {aktifSekme === 'Kitap' ? 'Okumak İstiyorum' : 'İzlemek İstiyorum'}
                  </option>
                  <option value={aktifSekme === 'Kitap' ? 'Okuyorum' : 'Devam Ediyorum'}>
                    {aktifSekme === 'Kitap' ? 'Okuyorum' : 'Devam Ediyorum'}
                  </option>
                  <option value={aktifSekme === 'Kitap' ? 'Okudum / Bitti' : 'İzledim / Bitti'}>
                    {aktifSekme === 'Kitap' ? 'Okudum / Bitti' : 'İzledim / Bitti'}
                  </option>
                  <option value="Yarım Bıraktım">Yarım Bıraktım</option>
                </select>

                <div className="flex gap-2">
                  <button 
                    onClick={() => duzenle(item)} 
                    className="text-gray-400 hover:text-blue-500 cursor-pointer p-1 transition-colors text-sm"
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => sil(item.id)} 
                    className="text-gray-400 hover:text-red-500 cursor-pointer p-1 transition-colors text-sm"
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtrelenmisListe.length === 0 && (
          <div className="col-span-full bg-white/80 backdrop-blur-xl rounded-3xl p-10 text-center border border-black/5">
            <p className="text-gray-400 text-xs font-light">Bu filtreye uygun kayıt bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}