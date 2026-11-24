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
    { 
      id: 'standart', ad: 'Sade',
      bgColor: '#f8f8fc', sidebarColor: '#ffffff',  accentColor: '#6366f1',
      desc: 'Temiz & Minimal'
    },
    { 
      id: 'bordo',   ad: 'Kadife Gül',
      bgColor: '#fef1f3', sidebarColor: '#fdf0f3',  accentColor: '#be123c',
      desc: 'Romantik & Sıcak'
    },
    { 
      id: 'kahve',   ad: 'Karamel',
      bgColor: '#fdf8f3', sidebarColor: '#fdf8f3',  accentColor: '#92400e',
      desc: 'Toprak & Derin'
    },
    { 
      id: 'yesil',   ad: 'Orman',
      bgColor: '#f0fdf6', sidebarColor: '#f0fdf6',  accentColor: '#059669',
      desc: 'Huzurlu & Taze'
    },
    { 
      id: 'pembe',   ad: 'Sakura',
      bgColor: '#fdf2f9', sidebarColor: '#fdf2f9',  accentColor: '#db2777',
      desc: 'Narin & Şirin'
    },
    { 
      id: 'mor',     ad: 'Galaktik',
      bgColor: '#faf4ff', sidebarColor: '#faf4ff',  accentColor: '#7c3aed',
      desc: 'Mistik & Güçlü'
    },
    { 
      id: 'mavi',    ad: 'Okyanus',
      bgColor: '#f0f7ff', sidebarColor: '#f0f7ff',  accentColor: '#2563eb',
      desc: 'Serin & Odaklı'
    },
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
      // Zorunlu minimum kaldırıldı — sıfır seçili olabilir
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

  const verileriCSVIndir = () => {
    try {
      let csvContent = "Anahtar,Deger\n";
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('lifeos_') || key && key.startsWith('maneviyat_')) {
          let val = localStorage.getItem(key);
          val = val.replace(/"/g, '""');
          csvContent += `"${key}","${val}"\n`;
        }
      }
      const dataStr = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvContent);
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `aura_lifeos_yedek_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      bildirimGoster('✅ Verileriniz CSV olarak indirildi!');
    } catch {
      bildirimGoster('❌ CSV dışa aktarma hatası.');
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
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Tema Rengi</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {renkler.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRenk(r.id)}
                  title={r.ad}
                  className={`group flex flex-col rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    renk === r.id
                      ? 'border-gray-800 shadow-lg scale-105'
                      : 'border-transparent hover:border-gray-300 hover:scale-102'
                  }`}
                >
                  {/* Tema Mini Önizleme */}
                  <div className="relative h-16 w-full" style={{ backgroundColor: r.bgColor }}>
                    {/* Sol kenar = sidebar rengi */}
                    <div className="absolute left-0 top-0 bottom-0 w-5 opacity-80" style={{ backgroundColor: r.sidebarColor, borderRight: `1px solid ${r.accentColor}22` }} />
                    {/* Minik kart */}
                    <div className="absolute left-7 top-2 right-2 h-5 rounded-md bg-white/70 shadow-sm" />
                    {/* Aksan nokta */}
                    <div className="absolute left-7 bottom-2 w-4 h-4 rounded-full shadow" style={{ backgroundColor: r.accentColor }} />
                    {/* Check mark */}
                    {renk === r.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                          <span className="text-sm font-bold" style={{ color: r.accentColor }}>✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Alt etiket */}
                  <div className={`px-2 py-1.5 text-center transition-colors ${
                    renk === r.id ? 'bg-gray-900' : 'bg-gray-50 group-hover:bg-gray-100'
                  }`}>
                    <p className={`text-[10px] font-bold leading-tight ${ renk === r.id ? 'text-white' : 'text-gray-700' }`}>{r.ad}</p>
                    <p className={`text-[9px] font-light leading-tight mt-0.5 ${ renk === r.id ? 'text-gray-300' : 'text-gray-400' }`}>{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── Sınav tercihleri ── */}
        <SectionCard icon="◎" title="Aktif Sınav Tercihleri" description="Sınav Takibi modülünde görünmesini istediğin standart ve özel sınavları işaretle.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Array.from(new Set([...TUM_SINAVLAR, ...seciliSinavlar])).map(sAdi => {
              const aktif = seciliSinavlar.includes(sAdi);
              const isOzel = !TUM_SINAVLAR.includes(sAdi);
              return (
                <button
                  key={sAdi}
                  onClick={() => sinavToggle(sAdi)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    aktif 
                      ? (isOzel ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-gray-900 text-white border-gray-900 shadow-sm') 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{sAdi}</span>
                  <span className="flex-shrink-0 opacity-80 text-[11px]">{aktif ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Veri güvenliği ── */}
        <SectionCard icon="🔒" title="Bulut ve Yerel Yedekleme" description="Tüm verilerini dışa aktar veya daha önce aldığın yedeği geri yükle.">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={verileriIndir}
                className="flex-1 bg-gray-900 text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥</span> JSON Yedeği İndir
              </button>
              <button
                onClick={verileriCSVIndir}
                className="flex-1 bg-emerald-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📊</span> CSV Olarak Dışa Aktar
              </button>
            </div>
            <label className="w-full bg-white border border-black/10 text-gray-700 px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1">
              <span>📤</span> JSON Yedeği Yükle
              <input type="file" accept=".json" onChange={verileriYukle} className="hidden" />
            </label>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
