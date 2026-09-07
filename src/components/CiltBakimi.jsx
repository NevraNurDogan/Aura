import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

export default function CiltBakimi() {
  const [ciltUrunleri, setCiltUrunleri] = useState([]);
  const [formGoster, setFormGoster] = useState(false);
  const [formData, setFormData] = useState({ 
    urunAdi: '', 
    kategori: 'Temizleme', 
    vakit: 'Her İkisi (Sabah & Akşam)', 
    gunler: [], 
    tamamlandi: false 
  });

  const haftaninGunleri = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  
  const bugunIndex = new Date().getDay();
  const gunMap = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const [secilenGun, setSecilenGun] = useState(gunMap[bugunIndex]);

  const getLocalDateStr = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const bugunStr = getLocalDateStr(new Date());

  const bugunTarihMetni = `${new Date().getDate()} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][new Date().getMonth()]} ${new Date().getFullYear()}`;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return getLocalDateStr(d);
  });

  const getYesterday = (dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return getLocalDateStr(date);
  };

  const getGunIsmi = (dateStr) => {
    const d = new Date(dateStr);
    return gunMap[d.getDay()];
  };

  const getTarihOfGun = (hedefGunIsmi) => {
    const bugun = new Date();
    const mevcutGunIndex = bugun.getDay() === 0 ? 6 : bugun.getDay() - 1;
    const gunlerListesi = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const hedefGunIndex = gunlerListesi.indexOf(hedefGunIsmi);
    const fark = hedefGunIndex - mevcutGunIndex;
    
    const hedefTarih = new Date(bugun);
    hedefTarih.setDate(bugun.getDate() + fark);
    return getLocalDateStr(hedefTarih);
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

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    let hamData = [];
    try {
      const q = query(collection(db, 'skincare'), where('userId', '==', userId));
      const snap = await getDocs(q);
      hamData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('lifeos_ciltbakimlari_cache', JSON.stringify(hamData));
    } catch (error) {
      const cached = localStorage.getItem('lifeos_ciltbakimlari_cache');
      if (cached) hamData = JSON.parse(cached);
    }

    const formatli = hamData.map(item => {
      const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',').filter(Boolean) : [];
      return {
        ...item,
        tarihler: tarihler,
        seri: calculateStreak(tarihler),
        bugunTamamlandi: tarihler.includes(bugunStr)
      };
    });
    setCiltUrunleri(formatli);
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const toggleTamamlandi = async (item) => {
    const isCurrentlyCompleted = (item.tarihler || []).includes(bugunStr);
    const yeniTarihler = isCurrentlyCompleted
      ? item.tarihler.filter(t => t !== bugunStr)
      : [...(item.tarihler || []), bugunStr];

    const yeniSeri = calculateStreak(yeniTarihler);
    const bugunDurumu = !isCurrentlyCompleted;

    const payload = {
      urunAdi: item.urunAdi,
      kategori: item.kategori,
      vakit: item.vakit,
      gunler: item.gunler,
      seri: yeniSeri,
      tamamlandi: bugunDurumu, 
      tamamlananTarihler: yeniTarihler.join(',')
    };

    setCiltUrunleri(prev => prev.map(u => u.id === item.id ? { 
      ...u, 
      tarihler: yeniTarihler, 
      seri: yeniSeri, 
      bugunTamamlandi: bugunDurumu 
    } : u));

    try {
      await updateDoc(doc(db, 'skincare', item.id.toString()), payload);
    } catch (error) {
      console.warn("Cilt bakımı güncellenemedi.");
    }
  };

  const handleGunToggle = (gun) => {
    if (formData.gunler.includes(gun)) {
      setFormData({ ...formData, gunler: formData.gunler.filter(g => g !== gun) });
    } else {
      setFormData({ ...formData, gunler: [...formData.gunler, gun] });
    }
  };

  const handleHerGunToggle = () => {
    if (formData.gunler.length === haftaninGunleri.length) {
      setFormData({ ...formData, gunler: [] });
    } else {
      setFormData({ ...formData, gunler: [...haftaninGunleri] });
    }
  };

  const kaydet = async () => {
    if (!formData.urunAdi.trim()) {
      alert("Lütfen ürün adı giriniz.");
      return;
    }
    if (formData.gunler.length === 0) {
      alert("Lütfen en az bir gün seçiniz (veya Her Gün'ü işaretleyin).");
      return;
    }

    const gunlerString = formData.gunler.length === 7 ? "Her Gün" : formData.gunler.join(', ');

    const payload = {
      userId,
      urunAdi: formData.urunAdi.trim(),
      kategori: formData.kategori,
      gunler: gunlerString,
      tamamlandi: false,
      seri: 0,
      tamamlananTarihler: ""
    };

    if (formData.vakit === 'Her İkisi (Sabah & Akşam)') {
      const sabahVeri = { ...payload, vakit: 'Sabah' };
      const aksamVeri = { ...payload, vakit: 'Akşam' };

      try {
        const ref1 = await addDoc(collection(db, 'skincare'), sabahVeri);
        const ref2 = await addDoc(collection(db, 'skincare'), aksamVeri);
        
        setCiltUrunleri([...ciltUrunleri, 
          { ...sabahVeri, id: ref1.id, tarihler: [], seri: 0, bugunTamamlandi: false },
          { ...aksamVeri, id: ref2.id, tarihler: [], seri: 0, bugunTamamlandi: false }
        ]);
        formuSifirla();
      } catch (error) { console.warn("Eklenemedi"); }
    } else {
      const tekilVeri = { ...payload, vakit: formData.vakit };
      try {
        const ref = await addDoc(collection(db, 'skincare'), tekilVeri);
        setCiltUrunleri([...ciltUrunleri, { ...tekilVeri, id: ref.id, tarihler: [], seri: 0, bugunTamamlandi: false }]);
      } catch (error) { console.warn("Eklenemedi"); }
      formuSifirla();
    }
  };

  const sil = async (id) => {
    if (window.confirm('Bu ürünü listeden silmek istediğine emin misin?')) {
      setCiltUrunleri(prev => prev.filter(u => u.id !== id));
      try {
        await deleteDoc(doc(db, 'skincare', id.toString()));
      } catch (error) {
        console.warn("Silinemedi.");
      }
    }
  };

  const formuSifirla = () => {
    setFormData({ urunAdi: '', kategori: 'Temizleme', vakit: 'Her İkisi (Sabah & Akşam)', gunler: [], tamamlandi: false });
    setFormGoster(false);
  };

  const gununUrunleri = ciltUrunleri.filter(u => u.gunler === 'Her Gün' || u.gunler.includes(secilenGun));
  const sabahUrunleri = gununUrunleri.filter(u => u.vakit === 'Sabah');
  const aksamUrunleri = gununUrunleri.filter(u => u.vakit === 'Akşam');

  const isBugunSecili = secilenGun === gunMap[bugunIndex];
  const secilenTarihStr = getTarihOfGun(secilenGun);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* BAŞLIK VE TARİH */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 flex items-center flex-wrap gap-3 font-normal">
            Cilt Bakımı
            <span className="text-xs sm:text-sm text-gray-400 font-sans font-medium border-l-2 border-gray-200 pl-3">
              {bugunTarihMetni}
            </span>
          </h2>
          <p className="text-xs text-gray-400 font-light">Kişisel cilt bakım rutinini planla ve takip et.</p>
        </div>
      </div>

      {/* 7 GÜNLÜK GENEL PERFORMANS TABLOSU */}
      <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-black/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
            Son 7 Günlük Rutin Performansı <span className="text-green-500">■</span>
          </h4>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-light">
            O gün uygulanması gereken adımların tamamını yaparsan kutu koyu yeşil yanar.
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 self-center md:self-auto overflow-x-auto w-full md:w-auto pb-1 md:pb-0 justify-between sm:justify-start">
          {last7Days.map((day) => {
            const gununIsmi = getGunIsmi(day);
            const toplamSayiForDay = ciltUrunleri.filter(a => a.gunler === 'Her Gün' || a.gunler.includes(gununIsmi)).length;
            const dayCount = ciltUrunleri.filter(a => a.tarihler && a.tarihler.includes(day)).length;
            
            const ratio = toplamSayiForDay === 0 ? 0 : dayCount / toplamSayiForDay;
            
            let bgClass = "bg-gray-100/80"; 
            if (ratio > 0 && ratio < 1) bgClass = "bg-green-200/80"; 
            if (ratio === 1 && toplamSayiForDay > 0) bgClass = "bg-green-500 text-white shadow-xs";

            const gunObj = new Date(day);
            const gunKisa = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][gunObj.getDay()];

            return (
              <div key={day} className="flex flex-col items-center gap-1.5 group cursor-pointer min-w-[36px]">
                <span className={`text-[10px] font-semibold transition-colors ${day === bugunStr ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                  {day === bugunStr ? 'BGN' : gunKisa}
                </span>
                <div title={`${day.split('-').reverse().join('.')} : ${dayCount}/${toplamSayiForDay} tamamlandı`} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-300 ${bgClass} flex items-center justify-center`}>
                   {ratio === 1 && toplamSayiForDay > 0 && <span className="text-white text-xs sm:text-sm font-bold">✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* GÜN SEÇİM BARı */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {haftaninGunleri.map(gun => (
          <button
            key={gun}
            onClick={() => setSecilenGun(gun)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${secilenGun === gun ? 'bg-gray-900 text-white shadow-xs' : 'bg-white/80 text-gray-600 border border-black/5 hover:bg-white'}`}
          >
            {gun} {gun === gunMap[bugunIndex] && '(Bugün)'}
          </button>
        ))}
      </div>

      {!isBugunSecili && (
        <div className="bg-orange-50/60 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
          <span className="text-orange-500 text-xl">ℹ️</span>
          <div>
            <p className="text-xs sm:text-sm text-orange-800 font-semibold">Farklı bir günü inceliyorsunuz.</p>
            <p className="text-[11px] text-orange-600">Geçmiş veya gelecek günlerin rutinlerini görebilirsiniz, işaretleme için <strong>Bugün</strong> sekmesine dönmelisiniz.</p>
          </div>
        </div>
      )}

      {/* RUTİNLER (SABAH & AKŞAM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sabah Rutini */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5">
          <h3 className="text-lg font-serif text-gray-900 mb-4 flex items-center gap-2 font-normal">☀️ Sabah Rutini ({secilenGun})</h3>
          <div className="space-y-3">
            {sabahUrunleri.map(item => {
              const isCompletedForSelectedDay = (item.tarihler || []).includes(secilenTarihStr);
              return (
                <div key={item.id} className={`group flex flex-col xl:flex-row xl:items-center justify-between p-3.5 rounded-2xl transition-all border gap-3 xl:gap-0 ${isCompletedForSelectedDay ? 'bg-green-50/40 border-green-100' : 'bg-white/60 border-black/5 hover:bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={!isBugunSecili}
                      onClick={() => toggleTamamlandi(item)} 
                      className={`w-6 h-6 min-w-[24px] rounded-lg border-2 flex items-center justify-center transition-colors
                        ${!isBugunSecili ? 'cursor-not-allowed opacity-40 bg-gray-100' : 'cursor-pointer hover:border-green-400'}
                        ${isCompletedForSelectedDay ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}
                      `}
                    >
                      {isCompletedForSelectedDay && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <div className={!isBugunSecili ? 'opacity-80' : ''}>
                      <span className={`font-medium block text-xs sm:text-sm transition-all ${isCompletedForSelectedDay ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.urunAdi}</span>
                      <span className="text-[11px] text-gray-400 font-light">{item.kategori} • <span className="text-orange-500 font-medium">{item.gunler}</span></span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-2 pl-9 xl:pl-0 ${!isBugunSecili ? 'opacity-70' : ''}`}>
                    <div className="flex gap-1 items-center bg-gray-100/60 p-1.5 rounded-lg border border-black/5">
                      {last7Days.map(day => (
                        <div 
                          key={day} 
                          title={`${day.split('-').reverse().join('.')} - ${(item.tarihler || []).includes(day) ? 'Yapıldı' : 'Yapılmadı'}`} 
                          className={`w-2 h-2 rounded-[2px] transition-colors ${(item.tarihler || []).includes(day) ? 'bg-green-500' : 'bg-gray-200'}`}
                        ></div>
                      ))}
                    </div>
                    <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 border ${item.seri > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`text-[10px] ${item.seri > 0 ? 'text-orange-500' : 'text-gray-400 grayscale opacity-50'}`}>🔥</span>
                      <span className={`font-semibold text-xs ${item.seri > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{item.seri}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {sabahUrunleri.length === 0 && <p className="text-gray-400 text-xs py-6 text-center font-light">Bu gün için sabah rutini bulunmuyor.</p>}
          </div>
        </div>

        {/* Akşam Rutini */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5">
          <h3 className="text-lg font-serif text-gray-900 mb-4 flex items-center gap-2 font-normal">🌙 Akşam Rutini ({secilenGun})</h3>
          <div className="space-y-3">
            {aksamUrunleri.map(item => {
              const isCompletedForSelectedDay = (item.tarihler || []).includes(secilenTarihStr);
              return (
                <div key={item.id} className={`group flex flex-col xl:flex-row xl:items-center justify-between p-3.5 rounded-2xl transition-all border gap-3 xl:gap-0 ${isCompletedForSelectedDay ? 'bg-green-50/40 border-green-100' : 'bg-white/60 border-black/5 hover:bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={!isBugunSecili}
                      onClick={() => toggleTamamlandi(item)} 
                      className={`w-6 h-6 min-w-[24px] rounded-lg border-2 flex items-center justify-center transition-colors
                        ${!isBugunSecili ? 'cursor-not-allowed opacity-40 bg-gray-100' : 'cursor-pointer hover:border-green-400'}
                        ${isCompletedForSelectedDay ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}
                      `}
                    >
                      {isCompletedForSelectedDay && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                    <div className={!isBugunSecili ? 'opacity-80' : ''}>
                      <span className={`font-medium block text-xs sm:text-sm transition-all ${isCompletedForSelectedDay ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.urunAdi}</span>
                      <span className="text-[11px] text-gray-400 font-light">{item.kategori} • <span className="text-orange-500 font-medium">{item.gunler}</span></span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 pl-9 xl:pl-0 ${!isBugunSecili ? 'opacity-70' : ''}`}>
                    <div className="flex gap-1 items-center bg-gray-100/60 p-1.5 rounded-lg border border-black/5">
                      {last7Days.map(day => (
                        <div 
                          key={day} 
                          title={`${day.split('-').reverse().join('.')} - ${(item.tarihler || []).includes(day) ? 'Yapıldı' : 'Yapılmadı'}`} 
                          className={`w-2 h-2 rounded-[2px] transition-colors ${(item.tarihler || []).includes(day) ? 'bg-green-500' : 'bg-gray-200'}`}
                        ></div>
                      ))}
                    </div>
                    <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 border ${item.seri > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                      <span className={`text-[10px] ${item.seri > 0 ? 'text-orange-500' : 'text-gray-400 grayscale opacity-50'}`}>🔥</span>
                      <span className={`font-semibold text-xs ${item.seri > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{item.seri}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {aksamUrunleri.length === 0 && <p className="text-gray-400 text-xs py-6 text-center font-light">Bu gün için akşam rutini bulunmuyor.</p>}
          </div>
        </div>
      </div>

      {/* YÖNETİM MATRİSİ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-serif text-gray-900 font-normal">Tüm Ürünler & İlerleme</h3>
            <p className="text-xs text-gray-400 font-light mt-0.5">Ürünlerin haftalık dağılımı ve listesi</p>
          </div>
          {!formGoster && (
            <button onClick={() => setFormGoster(true)} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-xs sm:text-sm font-medium hover:bg-black transition cursor-pointer">
              + Yeni Ürün Ekle
            </button>
          )}
        </div>

        {formGoster && (
          <div className="mb-6 bg-gray-50/80 p-5 rounded-2xl border border-black/5 flex flex-col gap-4">
            <h4 className="font-medium text-gray-800 text-sm">Yeni Cilt Bakım Ürünü Ekle</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input 
                type="text" placeholder="Ürün Adı (Örn: Nemlendirici Krem)"
                value={formData.urunAdi} onChange={(e) => setFormData({...formData, urunAdi: e.target.value})}
                className="p-3 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-400"
              />
              <select 
                value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                className="p-3 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-400"
              >
                <option value="Temizleme">Temizleme</option>
                <option value="Tonik">Tonik</option>
                <option value="Serum">Serum</option>
                <option value="Asit / Peeling">Asit / Peeling</option>
                <option value="Nemlendirici">Nemlendirici</option>
                <option value="Güneş Kremi">Güneş Kremi</option>
                <option value="Maske">Maske</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select 
                value={formData.vakit} onChange={(e) => setFormData({...formData, vakit: e.target.value})}
                className="p-3 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-700 bg-white focus:outline-none font-medium text-orange-600"
              >
                <option value="Her İkisi (Sabah & Akşam)">✨ Her İkisi (Sabah & Akşam Otomatik Ekle)</option>
                <option value="Sabah">Sadece Sabah</option>
                <option value="Akşam">Sadece Akşam</option>
              </select>
            </div>

            <div className="bg-white p-4 rounded-xl border border-black/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Hangi Günlerde Uygulanacak?</span>
                <button 
                  type="button" 
                  onClick={handleHerGunToggle} 
                  className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
                >
                  {formData.gunler.length === haftaninGunleri.length ? 'Seçimleri Kaldır' : '📌 Her Gün (Tümünü Seç)'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {haftaninGunleri.map(gun => {
                  const secili = formData.gunler.includes(gun);
                  return (
                    <button
                      key={gun}
                      type="button"
                      onClick={() => handleGunToggle(gun)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center justify-between ${secili ? 'bg-gray-900 text-white border-gray-900 shadow-xs' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                    >
                      <span>{gun}</span>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${secili ? 'bg-white text-gray-900 font-bold' : 'border border-gray-300'}`}>
                        {secili ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={formuSifirla} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-200 cursor-pointer text-xs">İptal</button>
              <button type="button" onClick={kaydet} className="px-5 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-black cursor-pointer text-xs">Kaydet</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-black/5 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Ürün Adı</th>
                <th className="py-3 px-4 font-medium">Kategori</th>
                <th className="py-3 px-4 font-medium">Vakit</th>
                <th className="py-3 px-4 font-medium">Uygulanan Günler</th>
                <th className="py-3 px-4 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 text-xs sm:text-sm">
              {ciltUrunleri.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-4 font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    {item.urunAdi}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">{item.kategori}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${item.vakit === 'Sabah' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                      {item.vakit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 font-medium">{item.gunler}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button onClick={() => sil(item.id)} className="text-gray-400 hover:text-red-500 cursor-pointer p-1">🗑️</button>
                  </td>
                </tr>
              ))}
              {ciltUrunleri.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-gray-400 py-8 text-xs font-light">
                    Kayıtlı ürün bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}