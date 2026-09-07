import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

export default function DonguTakibi() {
  const [donguler, setDonguler] = useState([]);
  const [orucBorcu, setOrucBorcu] = useState(() => parseInt(localStorage.getItem('lifeos_oruc_borcu') || '12'));
  const [tarih, setTarih] = useState(new Date());
  
  const yil = tarih.getFullYear();
  const ay = tarih.getMonth();
  const aydakiGunSayisi = new Date(yil, ay + 1, 0).getDate();
  const baslangicBoslugu = (new Date(yil, ay, 1).getDay() + 6) % 7;
  const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  const [seciliGun, setSeciliGun] = useState(null);
  const [aktifNot, setAktifNot] = useState('');
  
  const tarihMetniOlustur = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const bugunStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const gunFarkiBul = (tarih1, tarih2) => {
    const [y1, m1, d1] = tarih1.split('-').map(Number);
    const [y2, m2, d2] = tarih2.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    return Math.round((date1 - date2) / (1000 * 3600 * 24));
  };

  const tariheGunEkle = (dateStr, days) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    localStorage.setItem('lifeos_oruc_borcu', orucBorcu.toString());
  }, [orucBorcu]);

  const parseNotlar = (notlarStr, baslangicTarihi) => {
    if (!notlarStr) return {};
    try {
      const obj = JSON.parse(notlarStr);
      if (typeof obj === 'object') return obj;
      return { [baslangicTarihi]: notlarStr };
    } catch {
      return { [baslangicTarihi]: notlarStr };
    }
  };

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    let hamData = [];
    try {
      const q = query(collection(db, 'cycles'), where('userId', '==', userId));
      const snap = await getDocs(q);
      hamData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { console.warn("Firebase döngüleri çekilemedi."); }
    setDonguler(hamData);
    localStorage.setItem('lifeos_dongu_cache', JSON.stringify(hamData));
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  function ortalamaDonguSuresiHesapla(liste) {
    if (liste.length < 2) return 28;
    const sirali = [...liste].sort((a, b) => new Date(a.baslangicTarihi) - new Date(b.baslangicTarihi));
    let toplamGun = 0, farkSayisi = 0;
    for (let i = 1; i < sirali.length; i++) {
      const farkGun = gunFarkiBul(sirali[i].baslangicTarihi, sirali[i - 1].baslangicTarihi);
      if (farkGun > 15 && farkGun < 60) {
        toplamGun += farkGun;
        farkSayisi++;
      }
    }
    return farkSayisi === 0 ? 28 : Math.round(toplamGun / farkSayisi);
  }

  function ortalamaKanamaSuresiHesapla(liste) {
    const bitmis = liste.filter(d => d.sure > 0 && d.sure <= 15);
    if (bitmis.length === 0) return 5;
    let toplam = 0;
    bitmis.forEach(d => toplam += d.sure);
    return Math.round(toplam / bitmis.length);
  }

  const kisiselOrtalamaDongu = ortalamaDonguSuresiHesapla(donguler);
  const ortalamaKanama = ortalamaKanamaSuresiHesapla(donguler);
  const sonKayit = donguler.length > 0 ? [...donguler].sort((a, b) => new Date(b.baslangicTarihi) - new Date(a.baslangicTarihi))[0] : null;
  const devamEdenDongu = donguler.find(d => d.sure === 0);
  
  let sonrakiTahminTarih = "-";
  let kalanGun = null;
  let guncelDurumMetni = "Döngü hesaplanıyor...";
  let isReglDonemi = false;

  const reglGunleriSeti = new Set();
  const tahminiReglGunleriSeti = new Set();
  const notlarMap = {};

  donguler.forEach(d => {
    let hesaplananSure = d.sure;
    if (d.sure === 0) {
      // Kullanıcının isteği: Sadece girilen gün pembe olsun, bitir denilene kadar uzamasın.
      hesaplananSure = 1; 
    }

    for (let i = 0; i < hesaplananSure; i++) {
      reglGunleriSeti.add(tariheGunEkle(d.baslangicTarihi, i));
    }
    
    const gunlukNotlar = parseNotlar(d.notlar, d.baslangicTarihi);
    Object.keys(gunlukNotlar).forEach(tarih => {
      if (gunlukNotlar[tarih]) notlarMap[tarih] = gunlukNotlar[tarih];
    });
  });

  // ... (sonraki tahmin hesaplamaları aynı kalıyor)
  if (sonKayit) {
    sonrakiTahminTarih = tariheGunEkle(sonKayit.baslangicTarihi, kisiselOrtalamaDongu);
    kalanGun = gunFarkiBul(sonrakiTahminTarih, bugunStr());

    for (let c = 1; c <= 4; c++) {
      let tahminiBaslangic = tariheGunEkle(sonKayit.baslangicTarihi, kisiselOrtalamaDongu * c);
      for (let i = 0; i < ortalamaKanama; i++) {
        tahminiReglGunleriSeti.add(tariheGunEkle(tahminiBaslangic, i));
      }
    }

    const gecenGun = gunFarkiBul(bugunStr(), sonKayit.baslangicTarihi) + 1;
    if (devamEdenDongu) {
      guncelDurumMetni = `Reglinin ${gecenGun}. Günü`;
      isReglDonemi = true;
    } else {
      if (gecenGun > 0 && gecenGun <= sonKayit.sure) {
        guncelDurumMetni = `Reglinin ${gecenGun}. Günü`;
        isReglDonemi = true;
      } else {
        const temizGun = gecenGun - sonKayit.sure;
        guncelDurumMetni = `Döngünün ${gecenGun}. Günü (Temizliğin ${temizGun}. Günü)`;
        isReglDonemi = false;
      }
    }
  }

  const getAktifDongu = (tarihStr) => {
    return donguler.find(d => {
      const fark = gunFarkiBul(tarihStr, d.baslangicTarihi);
      if (fark >= 0) {
        if (d.sure > 0) return fark < d.sure; 
        // Döngü bitmemişse (sure=0), başlangıçtan sonraki herhangi bir gün bitiş günü olarak seçilebilir.
        return true;
      }
      return false;
    });
  };

  const aktifDongu = seciliGun ? getAktifDongu(seciliGun) : null;
  const seciliKacinciGun = aktifDongu ? gunFarkiBul(seciliGun, aktifDongu.baslangicTarihi) + 1 : 0;

  const gunSec = (g) => {
    const secilenTarih = tarihMetniOlustur(yil, ay, g);
    setSeciliGun(secilenTarih);
    setAktifNot(notlarMap[secilenTarih] || '');
  };

  const regliBaslat = async () => {
    if (!seciliGun) return;
    if (devamEdenDongu) {
      alert("Zaten devam eden bir regliniz var! Önce onu bitirmelisiniz.");
      return;
    }
    if (aktifDongu) {
      alert("Bu tarihte zaten bir regl kaydı var.");
      return;
    }

    const hesaplananOrtalama = ortalamaDonguSuresiHesapla([...donguler, { baslangicTarihi: seciliGun }]);
    
    const payload = { 
      userId,
      baslangicTarihi: seciliGun, 
      sure: 0, 
      donguSuresi: hesaplananOrtalama, 
      notlar: "{}" 
    };

    try {
      const docRef = await addDoc(collection(db, 'cycles'), payload);
      setDonguler([...donguler, { ...payload, id: docRef.id }]);
    } catch (e) {
      alert("Firebase Hatası: Kaydedilemedi.");
    }
  };

  const regliBitir = async () => {
    if (!aktifDongu || !seciliGun) return;
    
    const fark = gunFarkiBul(seciliGun, aktifDongu.baslangicTarihi) + 1;
    if (fark <= 0) {
      alert("Bitiş tarihi, başlangıçtan önce olamaz.");
      return;
    }

    const payload = { ...aktifDongu, sure: fark };
    setDonguler(prev => prev.map(d => d.id === aktifDongu.id ? payload : d));
    
    try {
      await updateDoc(doc(db, 'cycles', aktifDongu.id.toString()), { sure: fark });
    } catch (e) {
      console.warn("Güncellenemedi.");
    }
  };

  const notKaydet = async () => {
    if (!seciliGun) return;
    
    let hedefDongu = aktifDongu;
    if (!hedefDongu) {
      hedefDongu = donguler.length > 0 ? [...donguler].sort((a,b) => new Date(b.baslangicTarihi) - new Date(a.baslangicTarihi))[0] : null;
    }
    
    if (!hedefDongu) {
      alert("Not eklemek için önce bir regl kaydı oluşturmalısınız.");
      return;
    }

    const currentNotes = parseNotlar(hedefDongu.notlar, hedefDongu.baslangicTarihi);
    if (aktifNot.trim() === '') {
      delete currentNotes[seciliGun];
    } else {
      currentNotes[seciliGun] = aktifNot.trim();
    }

    const payload = { ...hedefDongu, notlar: JSON.stringify(currentNotes) };
    setDonguler(prev => prev.map(d => d.id === hedefDongu.id ? payload : d));

    try {
      await updateDoc(doc(db, 'cycles', hedefDongu.id.toString()), { notlar: JSON.stringify(currentNotes) });
      alert("Not kaydedildi.");
    } catch (e) {
      console.warn("Not kaydedilemedi.");
    }
  };

  const kaydiSil = async () => {
    if (!aktifDongu) return;
    if (window.confirm("Bu regl kaydını (tüm döngüyü) tamamen silmek istediğinize emin misiniz?")) {
      setDonguler(prev => prev.filter(d => d.id !== aktifDongu.id));
      setSeciliGun(null);
      try {
        await deleteDoc(doc(db, 'cycles', aktifDongu.id.toString()));
      } catch (e) { console.warn("Silinemedi."); }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal">Döngü & Regl Takibi</h2>
          <p className="text-xs text-gray-400 font-light">Gelişmiş akıllı tahmin ve kişisel sağlık kütüphanesi.</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-xs border border-black/5 flex items-center gap-3 self-end sm:self-auto">
          <span className="text-lg">🌙</span>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Oruç Borcu</p>
            <p className="text-base font-bold text-gray-800">{orucBorcu} <span className="text-xs font-normal text-gray-500">gün</span></p>
          </div>
          <div className="flex gap-1 ml-1">
            <button onClick={() => setOrucBorcu(p => Math.max(0, p - 1))} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold cursor-pointer transition text-xs">-</button>
            <button onClick={() => setOrucBorcu(p => p + 1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold cursor-pointer transition text-xs">+</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-rose-400 to-pink-500 text-white p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute right-20 -bottom-10 w-24 h-24 bg-rose-600/20 rounded-full blur-xl"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 bg-white/20 border border-white/30 backdrop-blur-md">
                {isReglDonemi ? '🩸 Regl Dönemindesin' : '✨ Temiz Dönem'}
              </div>
              <h3 className="text-3xl sm:text-4xl font-serif font-bold">
                {sonrakiTahminTarih !== "-" ? sonrakiTahminTarih.split('-').reverse().join(' ') : "Henüz kayıt yok"}
              </h3>
              <p className="text-xs sm:text-sm font-medium opacity-90 mt-1">
                {kalanGun !== null 
                  ? (kalanGun > 0 ? `Sıradaki tahmini regl tarihine ${kalanGun} gün kaldı.` : (kalanGun === 0 ? "Beklenen tarih bugün!" : `Tahmini tarih ${Math.abs(kalanGun)} gün geçti, her an başlayabilir.`))
                  : "Takvimden bir güne tıklayarak 'Başlangıç' işaretleyin."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-black/5 shadow-xs flex flex-col justify-center items-center text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">İstatistikler</p>
          <div className="flex gap-4">
            <div>
              <p className="text-3xl font-serif font-bold text-gray-800">{kisiselOrtalamaDongu}</p>
              <p className="text-[10px] font-medium text-gray-500 uppercase mt-1">Gün Döngü</p>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div>
              <p className="text-3xl font-serif font-bold text-gray-800">{ortalamaKanama}</p>
              <p className="text-[10px] font-medium text-gray-500 uppercase mt-1">Gün Kanama</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2rem] shadow-sm border border-black/5">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setTarih(new Date(yil, ay - 1, 1))} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-center transition text-lg text-gray-600">‹</button>
            <h3 className="text-xl sm:text-2xl font-serif text-gray-900 font-normal">{aylar[ay]} {yil}</h3>
            <button onClick={() => setTarih(new Date(yil, ay + 1, 1))} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-center transition text-lg text-gray-600">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => <div key={g}>{g}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 gap-y-3 text-center">
            {Array.from({ length: baslangicBoslugu }).map((_, i) => <div key={`bos-${i}`} />)}
            {Array.from({ length: aydakiGunSayisi }).map((_, i) => {
              const gun = i + 1;
              const formatliTarih = tarihMetniOlustur(yil, ay, gun);
              
              const isRegl = reglGunleriSeti.has(formatliTarih);
              const isTahmin = tahminiReglGunleriSeti.has(formatliTarih) && !isRegl; 
              const isSelected = seciliGun === formatliTarih;
              const isBaslangic = donguler.some(d => d.baslangicTarihi === formatliTarih);
              const isBitis = donguler.some(d => d.sure > 0 && tariheGunEkle(d.baslangicTarihi, d.sure - 1) === formatliTarih);
              const hasNot = !!notlarMap[formatliTarih];

              let bgClass = 'text-gray-700 hover:bg-gray-100';
              if (isRegl) bgClass = 'bg-pink-500 text-white font-bold shadow-md'; 
              else if (isTahmin) bgClass = 'bg-pink-50 text-pink-400 font-bold border border-dashed border-pink-300'; 
              
              return (
                <div 
                  key={gun} 
                  onClick={() => gunSec(gun)} 
                  className={`h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer text-xs sm:text-sm
                  ${bgClass}
                  ${isSelected ? 'ring-2 ring-offset-2 ring-gray-800 scale-105' : ''}`}
                >
                  <span className="z-10">{gun}</span>
                  
                  {isBaslangic && !isRegl && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute top-1 right-1"></span>}
                  
                  {hasNot && (
                    <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${isRegl ? 'bg-white' : 'bg-gray-400'}`}></span>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-[10px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-md bg-pink-500"></div> Gerçekleşen Regl</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-md bg-pink-50 border border-dashed border-pink-300"></div> Tahmini Regl</div>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Günlük Not</div>
          </div>
        </div>

        <div className="w-full md:w-80 bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-black/5 flex flex-col">
          <h4 className="text-[11px] font-bold text-gray-400 mb-4 tracking-wider uppercase text-center border-b border-black/5 pb-3">
            {seciliGun ? seciliGun.split('-').reverse().join(' ') : "GÜN DETAYI"}
          </h4>

          {seciliGun ? (
            <div className="flex flex-col gap-4 animate-fade-in flex-1">
              {aktifDongu ? (
                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex flex-col relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🩸</div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider mb-1 block">Regl Dönemi</span>
                    <p className="text-xl font-bold text-gray-800 mb-2">{seciliKacinciGun}. Gün</p>
                    <p className="text-xs text-gray-500 font-medium mb-3">
                      Başlangıç: {aktifDongu.baslangicTarihi.split('-').reverse().join('.')}<br/>
                      {aktifDongu.sure === 0 ? "Kanama devam ediyor..." : `Toplam ${aktifDongu.sure} gün sürdü.`}
                    </p>
                    
                    {aktifDongu.sure === 0 && (
                      <button onClick={regliBitir} className="w-full py-2 bg-pink-500 text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition shadow-xs cursor-pointer">
                        Reglim Bugün Bitti
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Döngü İşlemi</p>
                  <button onClick={regliBaslat} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition shadow-xs cursor-pointer">
                    🩸 Regl Başlangıcı İşaretle
                  </button>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Bu Güne Not Düş</label>
                <textarea 
                  value={aktifNot}
                  onChange={(e) => setAktifNot(e.target.value)}
                  placeholder="Kramp, ruh hali, belirtiler..."
                  className="w-full flex-1 p-3 rounded-2xl border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:border-pink-300 resize-none min-h-[100px]"
                />
                <button onClick={notKaydet} className="mt-2 w-full py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition cursor-pointer">
                  Notu Kaydet
                </button>
              </div>

              {aktifDongu && (
                <button onClick={kaydiSil} className="text-[10px] font-bold text-gray-400 hover:text-red-500 underline transition cursor-pointer text-center mt-auto">
                  Bu regl kaydını tamamen sil
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 flex-1">
              <span className="text-3xl mb-2">🗓️</span>
              <p className="text-xs text-gray-500 text-center font-medium">İşlem yapmak için takvimden bir gün seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}