import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

export default function Takvim() {
  const [tarih, setTarih] = useState(new Date());
  const [seciliGun, setSeciliGun] = useState(null);
  
  const [yeniEtkinlikBaslik, setYeniEtkinlikBaslik] = useState('');
  const [etkinlikler, setEtkinlikler] = useState([]);

  const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylul", "Ekim", "Kasım", "Aralık"];
  
  const yil = tarih.getFullYear();
  const ay = tarih.getMonth();
  const aydakiGunSayisi = new Date(yil, ay + 1, 0).getDate();
  const baslangicBoslugu = (new Date(yil, ay, 1).getDay() + 6) % 7;

  const bugun = new Date();
  const bugunGun = bugun.getDate();
  const bugunAy = bugun.getMonth();
  const bugunYil = bugun.getFullYear();

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    let hamData = [];
    try {
      const q = query(collection(db, 'calendar'), where('userId', '==', userId));
      const snap = await getDocs(q);
      hamData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('lifeos_takvim_cache', JSON.stringify(hamData));
    } catch (error) {
      const cached = localStorage.getItem('lifeos_takvim_cache');
      if (cached) hamData = JSON.parse(cached);
    }
    setEtkinlikler(hamData);
  };

  useEffect(() => {
    verileriGetir();
  }, []);

  const etkinlikEkle = async () => {
    if(!yeniEtkinlikBaslik.trim() || !seciliGun) return;

    const renkHavuzu = ['bg-blue-400', 'bg-red-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400'];
    const rastgeleRenk = renkHavuzu[Math.floor(Math.random() * renkHavuzu.length)];

    const payload = {
      userId,
      gun: seciliGun,
      ay: ay,
      yil: yil,
      baslik: yeniEtkinlikBaslik.trim(),
      renk: rastgeleRenk
    };

    try {
      const docRef = await addDoc(collection(db, 'calendar'), payload);
      setEtkinlikler([...etkinlikler, { ...payload, id: docRef.id }]);
    } catch (error) {
      console.warn("Eklenemedi.");
    }
    setYeniEtkinlikBaslik('');
  };

  const etkinlikSil = async (id) => {
    setEtkinlikler(prev => prev.filter(e => e.id !== id));
    try {
      await deleteDoc(doc(db, 'calendar', id.toString()));
    } catch (error) { console.warn("Silinemedi."); }
  };

  const buAydakiEtkinlikler = etkinlikler.filter(e => e.ay === ay && e.yil === yil);

  const bugunTarihObjesi = new Date(bugunYil, bugunAy, bugunGun);
  
  const dinamikYaklasanEtkinlikler = etkinlikler
    .map(e => {
      const eTarih = new Date(e.yil, e.ay, e.gun);
      const farkZaman = eTarih.getTime() - bugunTarihObjesi.getTime();
      const farkGun = Math.round(farkZaman / (1000 * 3600 * 24));
      return { ...e, eTarih, farkGun };
    })
    .filter(e => e.farkGun >= 0)
    .sort((a, b) => a.farkGun - b.farkGun)
    .slice(0, 4)
    .map(e => {
      let kalanMetni = `${e.farkGun} gün`;
      if (e.farkGun === 0) kalanMetni = 'Bugün';
      if (e.farkGun === 1) kalanMetni = 'Yarın';

      let tagRenk = 'bg-gray-50 text-gray-600';
      if (e.renk.includes('blue')) tagRenk = 'bg-blue-50 text-blue-600';
      if (e.renk.includes('red')) tagRenk = 'bg-red-50 text-red-500';
      if (e.renk.includes('green')) tagRenk = 'bg-green-50 text-green-600';
      if (e.renk.includes('purple')) tagRenk = 'bg-purple-50 text-purple-600';
      if (e.renk.includes('orange')) tagRenk = 'bg-orange-50 text-orange-600';
      if (e.renk.includes('pink')) tagRenk = 'bg-pink-50 text-pink-600';

      return {
        ...e,
        tarihMetni: `${e.gun} ${aylar[e.ay]}`,
        kalan: kalanMetni,
        tagRenk: tagRenk
      };
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal">Takvim</h2>
        <p className="text-xs text-gray-400 font-light">Etkinlikler, planlar ve zaman yönetimi.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white/80 backdrop-blur-xl p-5 sm:p-7 rounded-[2rem] shadow-sm border border-black/5 h-fit">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setTarih(new Date(yil, ay - 1, 1))} className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer flex items-center justify-center transition text-lg">‹</button>
            <h3 className="text-xl sm:text-2xl font-serif text-gray-900 font-normal">{aylar[ay]} {yil}</h3>
            <button onClick={() => setTarih(new Date(yil, ay + 1, 1))} className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer flex items-center justify-center transition text-lg">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-gray-400">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => <div key={g}>{g}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 gap-y-3 text-center">
            {Array.from({ length: baslangicBoslugu }).map((_, i) => <div key={`bos-${i}`} />)}
            {Array.from({ length: aydakiGunSayisi }).map((_, i) => {
              const gun = i + 1;
              const guneAitEtkinlikler = buAydakiEtkinlikler.filter(e => e.gun === gun);
              const isSelected = seciliGun === gun;
              const isToday = gun === bugunGun && ay === bugunAy && yil === bugunYil;
              
              return (
                <div 
                  key={gun} 
                  onClick={() => setSeciliGun(gun)} 
                  className={`h-10 w-10 sm:h-11 sm:w-11 mx-auto rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer text-xs sm:text-sm
                    ${isToday ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100'}
                    ${isSelected && !isToday ? 'border-2 border-gray-900 font-semibold' : ''}`}
                >
                  <span>{gun}</span>
                  {guneAitEtkinlikler.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {guneAitEtkinlikler.slice(0, 3).map((e, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${e.renk}`}></span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="w-full md:w-80 flex flex-col gap-6">
          {seciliGun ? (
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-black/5 animate-fade-in">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold text-gray-800 text-xs sm:text-sm">{seciliGun} {aylar[ay]} Etkinlikleri</h4>
                {seciliGun === bugunGun && ay === bugunAy && yil === bugunYil && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">BUGÜN</span>
                )}
              </div>
              
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Yeni etkinlik..." 
                  value={yeniEtkinlikBaslik}
                  onChange={(e) => setYeniEtkinlikBaslik(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && etkinlikEkle()}
                  className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400 transition"
                />
                <button onClick={etkinlikEkle} className="bg-gray-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-black cursor-pointer transition shadow-xs">+</button>
              </div>

              <div className="flex flex-col gap-2">
                {buAydakiEtkinlikler.filter(e => e.gun === seciliGun).map(etkinlik => (
                  <div key={etkinlik.id} className="flex items-center justify-between p-3 bg-white/70 border border-black/5 rounded-xl transition group">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${etkinlik.renk}`}></span>
                      <span className="text-xs font-medium text-gray-700">{etkinlik.baslik}</span>
                    </div>
                    <button onClick={() => etkinlikSil(etkinlik.id)} className="text-gray-400 hover:text-red-500 text-xs cursor-pointer p-1">🗑️</button>
                  </div>
                ))}
                {buAydakiEtkinlikler.filter(e => e.gun === seciliGun).length === 0 && (
                  <div className="py-6 text-center">
                    <span className="text-2xl opacity-40 block mb-1">🍃</span>
                    <span className="text-xs text-gray-400 font-light">Bu güne ait kayıtlı etkinlik yok.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-black/5 flex flex-col items-center justify-center py-8 text-center opacity-70">
              <span className="text-3xl mb-2">📅</span>
              <p className="text-xs text-gray-500 font-light px-2">Etkinlik eklemek veya görmek için takvimden bir gün seç.</p>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-sm border border-black/5">
            <h4 className="text-[11px] font-bold text-gray-400 mb-4 tracking-wider uppercase border-b border-black/5 pb-2.5">Yaklaşan Etkinlikler</h4>
            
            <div className="flex flex-col gap-3.5">
              {dinamikYaklasanEtkinlikler.length > 0 ? (
                dinamikYaklasanEtkinlikler.map(etkinlik => (
                  <div key={etkinlik.id} className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-2 h-2 rounded-full mt-1.5 ${etkinlik.renk}`}></span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{etkinlik.baslik}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{etkinlik.tarihMetni}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium shadow-xs ${etkinlik.tagRenk}`}>
                      {etkinlik.kalan}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center font-light py-2">Ufukta yaklaşan bir etkinlik görünmüyor.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}