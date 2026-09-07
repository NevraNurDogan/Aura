import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const POPULER_EMOJILER = ['✨', '💧', '🏃', '📚', '🧘', '🍏', '☕', '⚡', '🏋️', '🎨', '🌿', '📝', '🧠', '🎯', '🚴', '💊'];

export default function GunlukDuzen() {
  const [aliskanliklar, setAliskanliklar] = useState([]);
  const [formGoster, setFormGoster] = useState(false);
  const [formData, setFormData] = useState({ baslik: '', aciklama: '', ikon: '✨' });
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  
  const userId = getCurrentUserId();

  const getLocalDateStr = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const bugunStr = getLocalDateStr(new Date());
  
  const bugunTarihMetni = `${new Date().getDate()} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][new Date().getMonth()]} ${new Date().getFullYear()}`;

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

  const verileriGetir = async () => {
    try {
      const q = query(collection(db, 'habits'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const hamData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const formatli = hamData.map(item => {
        const tarihler = item.tamamlananTarihler ? item.tamamlananTarihler.split(',').filter(Boolean) : [];
        return {
          ...item,
          tarihler: tarihler,
          seri: calculateStreak(tarihler),
          bugunTamamlandi: tarihler.includes(bugunStr)
        };
      });
      setAliskanliklar(formatli);
    } catch (error) {
      console.error("Firebase'den veriler çekilemedi:", error);
    }
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const toggleTamamlandi = async (item) => {
    const yeniTarihler = item.bugunTamamlandi
      ? item.tarihler.filter(t => t !== bugunStr)
      : [...item.tarihler, bugunStr];

    const yeniSeri = calculateStreak(yeniTarihler);
    const bugunDurumu = yeniTarihler.includes(bugunStr);

    const guncelListe = aliskanliklar.map(a => a.id === item.id ? { 
      ...a, 
      tarihler: yeniTarihler, 
      seri: yeniSeri, 
      bugunTamamlandi: bugunDurumu 
    } : a);
    setAliskanliklar(guncelListe);

    try {
      const docRef = doc(db, 'habits', item.id);
      await updateDoc(docRef, {
        seri: yeniSeri,
        tamamlananTarihler: yeniTarihler.join(',')
      });
    } catch (error) { console.error("Güncelleme hatası", error); }
  };

  const kaydet = async () => {
    if (!formData.baslik.trim()) {
      alert("Lütfen alışkanlık adı giriniz.");
      return;
    }

    const secilenIkon = formData.ikon.trim() || '✨';

    if (duzenlenenId) {
      const guncelItem = aliskanliklar.find(a => a.id === duzenlenenId);
      if (guncelItem) {
        const payload = {
          baslik: formData.baslik.trim(),
          aciklama: formData.aciklama.trim(),
          ikon: secilenIkon
        };
        const yeniListe = aliskanliklar.map(a => a.id === duzenlenenId ? { ...a, ...payload } : a);
        setAliskanliklar(yeniListe);
        try {
          await updateDoc(doc(db, 'habits', duzenlenenId), payload);
        } catch (e) { console.error("Düzenleme hatası", e); }
      }
    } else {
      const yeniVeri = {
        userId,
        baslik: formData.baslik.trim(),
        aciklama: formData.aciklama.trim(),
        ikon: secilenIkon,
        seri: 0,
        tamamlananTarihler: ""
      };

      try {
        const docRef = await addDoc(collection(db, 'habits'), yeniVeri);
        setAliskanliklar([...aliskanliklar, { ...yeniVeri, id: docRef.id, tarihler: [], bugunTamamlandi: false }]);
      } catch (error) { 
        console.error("Ekleme hatası", error); 
        alert("Firebase Hatası (Muhtemelen Kurallar kapalı): " + error.message);
      }
    }
    formuSifirla();
  };

  const duzenleBaslat = (item) => {
    setDuzenlenenId(item.id);
    setFormData({ baslik: item.baslik, aciklama: item.aciklama || '', ikon: item.ikon || '✨' });
    setFormGoster(true);
  };

  const sil = async (id) => {
    if (window.confirm('Bu alışkanlığı silmek istediğine emin misin?')) {
      const yeniListe = aliskanliklar.filter(a => a.id !== id);
      setAliskanliklar(yeniListe);
      try {
        await deleteDoc(doc(db, 'habits', id));
      } catch (error) { console.error("Silme hatası", error); }
    }
  };

  const formuSifirla = () => {
    setFormData({ baslik: '', aciklama: '', ikon: '✨' });
    setDuzenlenenId(null);
    setFormGoster(false);
  };

  const son7GunData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = getLocalDateStr(d);
    
    const oGunTamamlanan = aliskanliklar.filter(a => a.tarihler && a.tarihler.includes(dStr)).length;
    
    return {
      gun: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
      tarih: dStr,
      tamamlanan: oGunTamamlanan
    };
  });

  const tamamlananSayisi = aliskanliklar.filter(a => a.bugunTamamlandi).length;
  const toplamSayi = aliskanliklar.length;
  const enYuksekSeri = aliskanliklar.length > 0 ? Math.max(...aliskanliklar.map(a => a.seri), 0) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 flex items-center flex-wrap gap-3 font-normal">
            Alışkanlıklar
            <span className="text-xs sm:text-sm text-gray-400 font-sans font-medium border-l-2 border-gray-200 pl-3">
              {bugunTarihMetni}
            </span>
          </h2>
          <p className="text-xs text-gray-400 font-light font-sans">Kendi seçeceğiniz ikonlar ve emojiler ile kişisel rutinlerinizi takip edin.</p>
        </div>
        <div className="flex items-center gap-6 self-end sm:self-auto">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-green-500/20 flex items-center justify-center relative bg-white shadow-xs">
              <span className="text-xs sm:text-sm font-semibold text-gray-700">{tamamlananSayisi}/{toplamSayi}</span>
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-1">
              <span className="text-orange-500 text-2xl sm:text-3xl">🔥</span> {enYuksekSeri}
            </p>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">En Uzun Seri</span>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-black/5 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-1/3">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Haftalık Performans</h3>
          <p className="text-xs text-gray-500 font-light mb-4">Son 7 gündeki alışkanlık tutarlılığın</p>
          <div className="flex gap-2 items-end">
            <span className="text-3xl font-serif text-blue-600">{son7GunData.reduce((acc, curr) => acc + curr.tamamlanan, 0)}</span>
            <span className="text-xs text-gray-400 mb-1">toplam tamamlama</span>
          </div>
        </div>
        <div className="w-full md:w-2/3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={son7GunData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="gun" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="tamamlanan" fill="#3b82f6" radius={[4, 4, 4, 4]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!formGoster && (
        <button 
          onClick={() => { setDuzenlenenId(null); setFormGoster(true); }}
          className="w-full py-3.5 bg-white/80 backdrop-blur-xl border border-dashed border-gray-300 rounded-2xl text-xs sm:text-sm font-semibold text-gray-600 hover:bg-white hover:border-gray-400 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          + Yeni Alışkanlık Ekle (Özel İkonlu)
        </button>
      )}

      {formGoster && (
        <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-md space-y-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
            {duzenlenenId ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Oluştur'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                İkon / Emoji
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={formData.ikon}
                  onChange={(e) => setFormData({...formData, ikon: e.target.value})}
                  placeholder="Emoji girin (Örn: 💧)"
                  className="w-24 p-2.5 border border-gray-200 rounded-xl text-center text-xl bg-gray-50 focus:outline-none focus:border-blue-400"
                />
                <div className="flex-1 flex gap-1.5 overflow-x-auto custom-scrollbar p-1">
                  {POPULER_EMOJILER.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setFormData({...formData, ikon: e})}
                      className={`p-2 rounded-xl text-lg hover:bg-gray-200 transition cursor-pointer ${formData.ikon === e ? 'bg-blue-100 border border-blue-300 scale-110' : 'bg-gray-100/70'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Alışkanlık Başlığı</label>
              <input 
                type="text" 
                placeholder="Örn: 2 Litre Su İç"
                value={formData.baslik}
                onChange={(e) => setFormData({...formData, baslik: e.target.value})}
                className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-blue-400 font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Açıklama / Hedef</label>
              <input 
                type="text" 
                placeholder="Örn: Her sabah kahvaltıdan önce 1 bardak su"
                value={formData.aciklama}
                onChange={(e) => setFormData({...formData, aciklama: e.target.value})}
                className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={formuSifirla} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer text-xs">İptal</button>
            <button onClick={kaydet} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black cursor-pointer text-xs shadow-xs">
              {duzenlenenId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {aliskanliklar.map(item => (
          <div 
            key={item.id} 
            className={`bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${item.bugunTamamlandi ? 'border-green-300 bg-green-50/20' : 'border-black/5 shadow-xs hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-3.5">
              <button 
                onClick={() => toggleTamamlandi(item)}
                className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition cursor-pointer ${item.bugunTamamlandi ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}
              >
                {item.bugunTamamlandi && <span className="text-xs font-bold">✓</span>}
              </button>

              <span className="text-2xl sm:text-3xl">{item.ikon || '✨'}</span>

              <div>
                <h3 className={`text-xs sm:text-base font-semibold ${item.bugunTamamlandi ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.baslik}
                </h3>
                {item.aciklama && <p className="text-[11px] text-gray-400 font-light mt-0.5">{item.aciklama}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-black/5 pt-2 sm:pt-0">
              <div className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-xl border border-orange-100">
                <span>🔥</span> {item.seri} Gün Seri
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => duzenleBaslat(item)} className="text-gray-400 hover:text-blue-600 text-xs p-1 cursor-pointer" title="Düzenle">✏️</button>
                <button onClick={() => sil(item.id)} className="text-gray-400 hover:text-red-500 text-xs p-1 cursor-pointer" title="Sil">🗑️</button>
              </div>
            </div>
          </div>
        ))}

        {aliskanliklar.length === 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 text-center border border-black/5">
            <p className="text-gray-400 text-xs font-light">Henüz alışkanlık eklemediniz. Yukarıdaki butondan kendi ikonunuzla alışkanlık oluşturabilirsiniz.</p>
          </div>
        )}
      </div>
    </div>
  );
}