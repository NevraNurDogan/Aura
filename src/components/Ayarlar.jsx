import { useState, useEffect } from 'react';

const TUM_SINAVLAR = ['TYT', 'AYT', 'KPSS Lisans', 'ALES', 'YÖKDİL / YDS', 'DGS', 'LGS'];

function SectionCard({ icon, title, description, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-black/5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 leading-tight">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5 font-light leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="px-6 sm:px-8 py-6">{children}</div>
    </div>
  );
}

export default function Ayarlar() {
  const [mod, setMod] = useState('acik');
  const [renk, setRenk] = useState('standart');
  const [seciliSinavlar, setSeciliSinavlar] = useState([]);
  const [bildirimMesaji, setBildirimMesaji] = useState('');
  const [sayfaHazir, setSayfaHazir] = useState(false);

  const renkler = [
    { id: 'standart', ad: 'Sade',   hex: '#f3f4f6' },
    { id: 'bordo',   ad: 'Bordo',   hex: '#800020' },
    { id: 'kahve',   ad: 'Kahve',   hex: '#8B4513' },
    { id: 'yesil',   ad: 'Yeşil',   hex: '#A8E6CF' },
    { id: 'pembe',   ad: 'Pembe',   hex: '#fbcfe8' },
    { id: 'mor',     ad: 'Mor',     hex: '#d8b4fe' },
    { id: 'mavi',    ad: 'Mavi',    hex: '#bfdbfe' },
  ];

  useEffect(() => {
    try {
      const kayitliMod = localStorage.getItem('lifeos_mod') || 'acik';
      const kayitliRenk = localStorage.getItem('lifeos_renk') || 'standart';
      setMod(kayitliMod);
      setRenk(kayitliRenk);

      const cached = localStorage.getItem('lifeos_secili_sinavlar');
      if (cached) {
        const parsed = JSON.parse(cached);
        setSeciliSinavlar(Array.isArray(parsed) ? parsed : ['TYT', 'AYT']);
      } else {
        setSeciliSinavlar(['TYT', 'AYT']);
      }
    } catch {
      setSeciliSinavlar(['TYT', 'AYT']);
    } finally {
      setSayfaHazir(true);
    }
  }, []);

  useEffect(() => {
    if (!sayfaHazir) return;
    try {
      localStorage.setItem('lifeos_mod', mod);
      localStorage.setItem('lifeos_renk', renk);
      document.documentElement.setAttribute('data-mod', mod);
      document.documentElement.setAttribute('data-renk', renk);
    } catch {
      console.warn('Tema kaydedilemedi.');
    }
  }, [mod, renk, sayfaHazir]);

  const sinavToggle = (sAdi) => {
    if (seciliSinavlar.includes(sAdi)) {
      if (seciliSinavlar.length <= 1) {
        bildirimGoster('⚠️ En az 1 sınav seçili olmalıdır.');
        return;
      }
      const yeni = seciliSinavlar.filter(s => s !== sAdi);
      setSeciliSinavlar(yeni);
      localStorage.setItem('lifeos_secili_sinavlar', JSON.stringify(yeni));
      bildirimGoster('✅ Sınav listeniz güncellendi.');
    } else {
      const yeni = [...seciliSinavlar, sAdi];
      setSeciliSinavlar(yeni);
      localStorage.setItem('lifeos_secili_sinavlar', JSON.stringify(yeni));
      bildirimGoster('✅ Sınav listeniz güncellendi.');
    }
  };

  const bildirimGoster = (mesaj) => {
    setBildirimMesaji(mesaj);
    setTimeout(() => setBildirimMesaji(''), 4000);
  };

  const verileriIndir = () => {
    try {
      const veriler = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lifeos_')) veriler[key] = localStorage.getItem(key);
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(veriler, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `aura_lifeos_yedek_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      bildirimGoster('✅ Verileriniz başarıyla indirildi!');
    } catch {
      bildirimGoster('❌ Dışa aktarma sırasında hata.');
    }
  };

  const verileriYukle = (e) => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.readAsText(e.target.files[0], 'UTF-8');
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        Object.keys(parsed).forEach(key => localStorage.setItem(key, parsed[key]));
        bildirimGoster('🎉 Yedeğiniz yüklendi! Sayfa yenileniyor…');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        bildirimGoster('❌ Geçersiz yedek dosyası!');
      }
    };
  };

  if (!sayfaHazir) {
    return <div className="text-center p-10 text-gray-400 text-sm animate-pulse">Ayarlar yükleniyor…</div>;
  }

  return (
    <div className="animate-fade-in pb-4">

      {/* Sayfa başlığı */}
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 font-normal tracking-tight">Ayarlar</h2>
        <p className="text-gray-400 text-sm font-light mt-1">
          Uygulamanı kişiselleştir ve verilerini güvende tut.
        </p>
      </div>

      {/* Toast bildirimi */}
      {bildirimMesaji && (
        <div className="mb-6 p-4 rounded-2xl bg-[#1d1d1f] text-white text-sm font-medium shadow-lg animate-fade-in flex items-center justify-between">
          <span>{bildirimMesaji}</span>
          <button onClick={() => setBildirimMesaji('')} className="text-xs opacity-60 hover:opacity-100 cursor-pointer ml-4">✕</button>
        </div>
      )}

      <div className="flex flex-col gap-4">

        {/* ── Görünüm ── */}
        <SectionCard icon="🎨" title="Görünüm" description="Aydınlatma modunu ve tema rengini seç.">
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Aydınlatma Modu</p>
            <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-black/5 w-full sm:w-fit">
              <button
                onClick={() => setMod('acik')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${mod === 'acik' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ☀️ Gündüz
              </button>
              <button
                onClick={() => setMod('koyu')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${mod === 'koyu' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                🌙 Gece
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tema Rengi</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {renkler.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRenk(r.id)}
                  title={r.ad}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border cursor-pointer ${renk === r.id ? 'border-gray-800 bg-white shadow-md scale-105' : 'border-black/5 hover:border-black/10 hover:bg-white/60'}`}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-inner border border-black/10"
                    style={{ backgroundColor: r.hex }}
                  />
                  <span className={`text-[10px] font-semibold leading-tight text-center ${renk === r.id ? 'text-gray-900' : 'text-gray-400'}`}>
                    {r.ad}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Sınav tercihleri ── */}
        <SectionCard icon="◎" title="Aktif Sınav Tercihleri" description="Sınav Takibi modülünde görünmesini istediğin sınavları işaretle.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TUM_SINAVLAR.map(sAdi => {
              const aktif = seciliSinavlar.includes(sAdi);
              return (
                <button
                  key={sAdi}
                  onClick={() => sinavToggle(sAdi)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1 ${aktif ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                >
                  <span className="truncate">{sAdi}</span>
                  <span className="flex-shrink-0 opacity-70">{aktif ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Veri güvenliği ── */}
        <SectionCard icon="🔒" title="Veri Güvenliği & Yedekleme" description="Tüm verilerini dışa aktar veya daha önce aldığın yedeği geri yükle.">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={verileriIndir}
              className="flex-1 bg-gray-900 text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>📥</span> Yedeğimi İndir
            </button>
            <label className="flex-1 bg-white border border-black/10 text-gray-700 px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2">
              <span>📤</span> Yedek Yükle
              <input type="file" accept=".json" onChange={verileriYukle} className="hidden" />
            </label>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
