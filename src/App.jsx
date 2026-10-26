import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
const AnaSayfa = lazy(() => import('./components/AnaSayfa'));
const Ajanda = lazy(() => import('./components/Ajanda'));
const GunlukDuzen = lazy(() => import('./components/GunlukDuzen'));
const CiltBakimi = lazy(() => import('./components/CiltBakimi'));
const IzlemeOkuma = lazy(() => import('./components/IzlemeArsivi'));
const SinavGorevleri = lazy(() => import('./components/SinavTakibi'));
const Dongu = lazy(() => import('./components/DonguTakibi'));
const Maneviyat = lazy(() => import('./components/Maneviyat'));
const Profil = lazy(() => import('./components/Profil'));
const Istatistikler = lazy(() => import('./components/Istatistikler'));
const Takvim = lazy(() => import('./components/Takvim'));
const Ayarlar = lazy(() => import('./components/Ayarlar'));
const AiAsistan = lazy(() => import('./components/AiAsistan'));
const Sosyal = lazy(() => import('./components/Sosyal'));

const YukeIkonu = () => (
  <div className="flex flex-col gap-6 p-2 md:p-6 animate-pulse w-full max-w-5xl mx-auto opacity-60">
    <div className="h-40 md:h-48 bg-gray-200 rounded-[2.5rem] w-full"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-64 bg-gray-200 rounded-[2.5rem]"></div>
      <div className="h-64 bg-gray-200 rounded-[2.5rem]"></div>
      <div className="h-64 bg-gray-200 rounded-[2.5rem]"></div>
    </div>
  </div>
);

/* ─── Tanıtım Turu Verileri ─────────────────────────────────── */
const TANITIM_ADIMLARI = [
  {
    ikon: '✦',
    renkBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    renkMetin: '#fff',
    baslik: 'Aura\'ya Hoş Geldi!',
    aciklama:
      'Aura, hayatının farklı yönlerini tek çatı altında yönetmeni sağlayan kişisel bir dijital asistanındır. Sadece ihtiyacın olan modülleri aktif et — sade, odaklı ve senin için.',
  },
  {
    ikon: '❖',
    renkBg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    renkMetin: '#fff',
    baslik: 'Günlük Düzen',
    aciklama:
      'Günlük alışkanlıklarını takip et, zincirini kırma. Sabah rutininden gece yatış saatine kadar her adımı kayıt altına al. Tutarlılık, değişimin anahtarıdır.',
  },
  {
    ikon: '✦',
    renkBg: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
    renkMetin: '#5a3e6b',
    baslik: 'Cilt Bakımı',
    aciklama:
      'Kişisel bakım rutinini planla, ürünlerini yönet ve cildin nasıl tepki verdiğini izle. Sabah & gece rutinlerini ayrı ayrı düzenle.',
  },
  {
    ikon: '◈',
    renkBg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    renkMetin: '#1e3a5f',
    baslik: 'İzleme Arşivi',
    aciklama:
      'Film, dizi, kitap, podcast... İzlemek istediklerini listele, bitirdiklerini arşivle. Her şey tek yerde, düzenli ve erişilebilir.',
  },
  {
    ikon: '◎',
    renkBg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    renkMetin: '#7c3d12',
    baslik: 'Sınav Takibi',
    aciklama:
      'Net hedeflerini belirle, ders çalışma sürelerini kayıt et, gelişimini grafiklerle izle. TYT\'den KPSS\'ye tüm sınavları destekler.',
  },
  {
    ikon: '○',
    renkBg: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    renkMetin: '#5c1d6b',
    baslik: 'Döngü Takibi',
    aciklama:
      'Aylık döngünü takip et, belirtilerini not et, sağlık örüntülerini keşfet. Tamamen özel ve güvenli — veriler yalnızca senin cihazında.',
  },
  {
    ikon: '☽',
    renkBg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    renkMetin: '#2d1b69',
    baslik: 'Maneviyat & Huzur',
    aciklama:
      'İç huzurunu besle. Namaz vakitlerini takip et, dua & zikir rutinlerini oluştur, manevi yolculuğunu kayıt altına al.',
  },
];

/* ─── Modül Listesi ─────────────────────────────────────────── */
const MODULLER = {
  ajanda:    { icon: '▤', ad: 'Ajanda',            aciklama: 'Günlük planların ve geçmiş kayıtların',               iconBg: 'bg-purple-50',  iconRenk: 'text-purple-500' },
  gunluk:    { icon: '❖', ad: 'Günlük Düzen',      aciklama: 'Alışkanlıklarını takip et, zincirini kırma',          iconBg: 'bg-orange-50',  iconRenk: 'text-orange-500' },
  cilt:      { icon: '✦', ad: 'Cilt Bakımı',        aciklama: 'Kişisel bakım rutinini planla ve izle',               iconBg: 'bg-red-50',     iconRenk: 'text-rose-400' },
  izleme:    { icon: '◈', ad: 'İzleme Arşivi',      aciklama: 'İzleme listenizi yönet ve arşivle',                   iconBg: 'bg-blue-50',    iconRenk: 'text-blue-500' },
  sinav:     { icon: '◎', ad: 'Sınav Takibi',       aciklama: 'Net hedeflerini belirle, gelişimini izle',             iconBg: 'bg-amber-50',   iconRenk: 'text-amber-600' },
  dongu:     { icon: '○', ad: 'Döngü Takibi',       aciklama: 'Döngünü takip et, sağlığını izle',                    iconBg: 'bg-pink-50',    iconRenk: 'text-pink-400' },
  maneviyat: { icon: '☽', ad: 'Maneviyat & Huzur', aciklama: 'İç huzurunu besle, manevi rutinini oluştur',          iconBg: 'bg-indigo-50',  iconRenk: 'text-indigo-400' },
};

/* ═══════════════════════════════════════════════════════════════
   GİRİŞ EKRANI
═══════════════════════════════════════════════════════════════ */
function GirisEkrani({ onDevam }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mesaj, setMesaj] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("Tarayıcınız otomatik yüklemeyi desteklemiyor veya uygulama zaten yüklü. Lütfen tarayıcı menüsünden 'Ana Ekrana Ekle' (veya Uygulamayı Yükle) seçeneğini kullanın.");
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      if (Capacitor.isNativePlatform()) {
        const response = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(response.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error(error);
      const errDetail = error.message || JSON.stringify(error) || 'Bilinmeyen hata';
      setMesaj(`Google Hata Kodu: ${errDetail}`);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') setMesaj('Bu e-posta adresi zaten kullanılıyor.');
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setMesaj('E-posta veya şifre hatalı.');
      else if (error.code === 'auth/weak-password') setMesaj('Şifre çok zayıf (en az 6 karakter).');
      else setMesaj('Hata oluştu. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="giris-bg min-h-screen bg-[#fbfbfd] flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl text-white mx-auto mb-4 shadow-lg shadow-purple-200">
            ✦
          </div>
          <h1 className="text-4xl font-serif text-gray-900 font-normal tracking-tight">Aura</h1>
          <p className="text-gray-400 text-sm mt-1 font-light">Kişisel yaşam asistanın</p>
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8 space-y-6">
          <button 
            onClick={handleGoogle} 
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Google ile Devam Et
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">veya</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                E-Posta Adresiniz
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength="6"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer ${
                email && password && !loading
                  ? 'bg-gray-900 text-white hover:bg-black hover:scale-[1.02] active:scale-[0.98] shadow-md'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Bekleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
            </button>
          </form>
          {mesaj && <p className="text-xs text-center text-indigo-600 font-medium leading-relaxed">{mesaj}</p>}
          
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-xs text-gray-500 hover:text-indigo-600 cursor-pointer"
          >
            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
          </button>
        </div>

        <button 
          onClick={handleInstallClick}
          className="mt-6 w-full py-3.5 rounded-2xl font-semibold text-sm bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
        >
          📱 Uygulamayı Cihazına Yükle
        </button>

        <p className="text-center text-xs text-gray-400 mt-5 font-light">
          Verileriniz güvenle bulutta saklanır ve tüm cihazlarınızda anında senkronize edilir.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TANITIM TURU EKRANI
═══════════════════════════════════════════════════════════════ */
function TanitimEkrani({ kullaniciAdi, onBitir }) {
  const [adim, setAdim] = useState(0);
  const toplam = TANITIM_ADIMLARI.length;
  const current = TANITIM_ADIMLARI[adim];
  const ilk = adim === 0;
  const son = adim === toplam - 1;

  return (
    <div className="giris-bg min-h-screen bg-[#fbfbfd] flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          {TANITIM_ADIMLARI.map((_, i) => (
            <div
              key={i}
              onClick={() => i < adim && setAdim(i)}
              className={`h-1.5 rounded-full transition-all duration-300 progress-bg ${
                i === adim ? 'w-8 bg-gray-900' : i < adim ? 'w-4 bg-gray-400 cursor-pointer' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="tanitim-kart bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden mb-6 transition-all duration-300">
          <div
            className="h-52 flex flex-col items-center justify-center text-6xl"
            style={{ background: current.renkBg }}
          >
            <span className="mb-2" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}>
              {current.ikon}
            </span>
            {ilk && (
              <p className="text-white/80 text-sm font-medium mt-1">
                Merhaba, {kullaniciAdi}! 👋
              </p>
            )}
          </div>

          <div className="p-7">
            <h2 className="text-2xl font-serif text-gray-900 font-normal mb-3 tracking-tight">
              {current.baslik}
            </h2>
            <p className="text-gray-500 text-sm font-light leading-relaxed">
              {current.aciklama}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {!ilk && (
            <button
              onClick={() => setAdim(a => a - 1)}
              className="px-5 py-3 rounded-2xl text-sm font-medium text-gray-500 bg-white border border-black/5 hover:bg-gray-50 transition cursor-pointer"
            >
              ← Geri
            </button>
          )}
          <button
            onClick={() => son ? onBitir() : setAdim(a => a + 1)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-gray-900 text-white hover:bg-black transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
          >
            {son ? 'Modülleri Seç →' : 'Sonraki →'}
          </button>
        </div>

        {!son && (
          <button
            onClick={onBitir}
            className="w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600 transition cursor-pointer"
          >
            Geç, doğrudan modül seçimine git →
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ONBOARDING — MODÜL SEÇİMİ
═══════════════════════════════════════════════════════════════ */
function OnboardingEkrani({ seciliModuller, toggleModul, onBitir }) {
  const aktifSayi = Object.values(seciliModuller).filter(Boolean).length;

  return (
    <div className="onboarding-bg min-h-screen bg-[#fbfbfd] flex flex-col items-center justify-center font-sans py-12 px-4">
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-3xl md:text-4xl font-serif text-gray-900 mb-2 tracking-tight">
          Sana ne lazım?
        </h1>
        <p className="text-gray-400 text-sm font-light">
          İstediğin modülleri seç. Dilediğin zaman Ayarlar'dan değiştirebilirsin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full mb-8">
        {Object.entries(MODULLER).map(([key, data]) => {
          const secili = seciliModuller[key];
          return (
            <div
              key={key}
              onClick={() => toggleModul(key)}
              className={`p-5 md:p-6 rounded-3xl border transition-all cursor-pointer relative ${
                secili
                  ? 'modul-kart-secili bg-white border-black/10 shadow-md shadow-black/5'
                  : 'modul-kart-normal bg-white/40 border-black/5 hover:border-black/10'
              }`}
            >
              {secili && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-gray-900 rounded-full text-white flex items-center justify-center text-xs shadow-sm">
                  ✓
                </div>
              )}
              <div className={`w-10 h-10 ${data.iconBg} rounded-2xl flex items-center justify-center ${data.iconRenk} mb-3 text-xl`}>
                {data.icon}
              </div>
              <h3 className="font-semibold text-gray-900">{data.ad}</h3>
              <p className="text-xs text-gray-400 mt-1 font-light">{data.aciklama}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onBitir}
        disabled={aktifSayi === 0}
        className={`px-8 py-4 rounded-2xl font-medium text-sm transition-all shadow-lg cursor-pointer ${
          aktifSayi > 0
            ? 'bg-[#1d1d1f] text-white hover:bg-black shadow-black/10 hover:scale-105 active:scale-95'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
        }`}
      >
        {aktifSayi} modül ile başla →
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANA APP
═══════════════════════════════════════════════════════════════ */
function App() {
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [akim, setAkim] = useState('giris'); 
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem('lifeos_kullanici', user.uid);
        const gercekIsim = user.displayName || user.email.split('@')[0] || 'Kullanıcı';
        setKullaniciAdi(gercekIsim);
        
        // Profil ismini zorla düzelt
        const mevcutProfilIsmi = localStorage.getItem('lifeos_profil_isim');
        if (!mevcutProfilIsmi || mevcutProfilIsmi === 'Kullanıcı') {
          localStorage.setItem('lifeos_profil_isim', gercekIsim);
        }
        
        const tamamlandi = localStorage.getItem('lifeos_onboarding_tamamlandi');
        if (tamamlandi) setAkim('app');
        else setAkim('tanitim');
      } else {
        localStorage.removeItem('lifeos_kullanici');
        setAkim('giris');
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const [aktifSayfa, setAktifSayfa] = useState('anasayfa');
  const [mobileMenuAcik, setMobileMenuAcik] = useState(false);

  const [seciliModuller, setSeciliModuller] = useState(() => {
    const kayitli = localStorage.getItem('lifeos_secili_moduller');
    if (kayitli) {
      let parsed = JSON.parse(kayitli);
      // Eski sürümden kalan "duzen" anahtarını "gunluk" olarak güncelle
      if (parsed.duzen !== undefined && parsed.gunluk === undefined) {
        parsed.gunluk = parsed.duzen;
        delete parsed.duzen;
        localStorage.setItem('lifeos_secili_moduller', JSON.stringify(parsed));
      }
      return parsed;
    }
    return { gunluk: true, cilt: true, izleme: true, sinav: true, dongu: true, maneviyat: true };
  });

  useEffect(() => {
    const mod = localStorage.getItem('lifeos_mod') || 'acik';
    const renk = localStorage.getItem('lifeos_renk') || 'standart';
    document.documentElement.setAttribute('data-mod', mod);
    document.documentElement.setAttribute('data-renk', renk);
  }, []);

  useEffect(() => {
    localStorage.setItem('lifeos_secili_moduller', JSON.stringify(seciliModuller));
  }, [seciliModuller]);

  const toggleModul = (modul) =>
    setSeciliModuller(prev => ({ ...prev, [modul]: !prev[modul] }));

  const sayfaDegistir = (sayfaId) => {
    setAktifSayfa(sayfaId);
    setMobileMenuAcik(false);
  };

  const sayfaBasliklari = {
    anasayfa: 'Ana Sayfa',
    ajanda: 'Ajanda',
    takvim: 'Takvim & Etkinlikler',
    gunluk: 'Günlük Düzen',
    cilt: 'Cilt Bakımı',
    izleme: 'İzleme Arşivi',
    sinav: 'Sınav Takibi',
    dongu: 'Döngü Takibi',
    profil: 'Profil',
    ayarlar: 'Ayarlar & Görünüm',
    maneviyat: 'Maneviyat & Huzur',
    sosyal: 'Aura Topluluğu',
  };

  const sayfaIkonlari = {
    anasayfa: '✦',
    gunluk: '❖',
    cilt: '✦',
    izleme: '◈',
    sinav: '◎',
    dongu: '○',
    maneviyat: '☽',
    sosyal: '👥',
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (akim === 'giris') {
    return <GirisEkrani />;
  }

  if (akim === 'tanitim') {
    return (
      <TanitimEkrani
        kullaniciAdi={kullaniciAdi}
        onBitir={() => setAkim('onboarding')}
      />
    );
  }

  if (akim === 'onboarding') {
    return (
      <OnboardingEkrani
        seciliModuller={seciliModuller}
        toggleModul={toggleModul}
        onBitir={() => {
          localStorage.setItem('lifeos_onboarding_tamamlandi', '1');
          setAkim('app');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-transparent font-sans text-gray-800 transition-colors duration-500">
      <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuAcik(!mobileMenuAcik)}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition cursor-pointer text-lg"
            aria-label="Menü"
          >
            {mobileMenuAcik ? '✕' : '☰'}
          </button>
          <div className="ml-1">
            <h1 className="text-xl font-serif text-gray-900 font-normal leading-tight">Aura</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase">
              {sayfaBasliklari[aktifSayfa] || 'Workspace'}
            </p>
          </div>
        </div>
        <button
          onClick={() => sayfaDegistir('profil')}
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white font-bold flex items-center justify-center text-sm shadow-sm cursor-pointer"
        >
          ✧
        </button>
      </header>

      {mobileMenuAcik && (
        <div
          onClick={() => setMobileMenuAcik(false)}
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-xs z-40 animate-fade-in"
        />
      )}

      <aside className={`w-64 fixed top-0 left-0 h-full border-r border-black/5 flex flex-col z-50 py-8 px-4 bg-white/80 backdrop-blur-2xl transition-transform duration-300 ${mobileMenuAcik ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-8 px-3 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-gray-900 tracking-tight font-normal">Aura</h1>
            <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide uppercase font-medium">
              {kullaniciAdi ? `Merhaba, ${kullaniciAdi}` : 'Personal Workspace'}
            </p>
          </div>
          <button
            onClick={() => setMobileMenuAcik(false)}
            className="lg:hidden text-gray-400 hover:text-gray-700 p-1 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button onClick={() => sayfaDegistir('anasayfa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'anasayfa' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
            <span className="text-lg">⊞</span> Ana Sayfa
          </button>

          {seciliModuller.ajanda && (
            <button onClick={() => sayfaDegistir('ajanda')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'ajanda' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">▤</span> Ajanda
            </button>
          )}

          <button onClick={() => sayfaDegistir('takvim')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'takvim' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
            <span className="text-lg">◫</span> Takvim
          </button>

          {seciliModuller.gunluk && (
            <button onClick={() => sayfaDegistir('gunluk')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'gunluk' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">❖</span> Günlük Düzen
            </button>
          )}

          {seciliModuller.cilt && (
            <button onClick={() => sayfaDegistir('cilt')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'cilt' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">✦</span> Cilt Bakımı
            </button>
          )}

          {seciliModuller.izleme && (
            <button onClick={() => sayfaDegistir('izleme')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'izleme' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">◈</span> İzleme Arşivi
            </button>
          )}

          {seciliModuller.sinav && (
            <button onClick={() => sayfaDegistir('sinav')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'sinav' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">◎</span> Sınav Takibi
            </button>
          )}

          {seciliModuller.dongu && (
            <button onClick={() => sayfaDegistir('dongu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'dongu' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">○</span> Döngü Takibi
            </button>
          )}

          {seciliModuller.maneviyat && (
            <button onClick={() => sayfaDegistir('maneviyat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'maneviyat' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">☽</span> Maneviyat
            </button>
          )}

          <div className="pt-4 mt-4 border-t border-black/5">
            <button onClick={() => sayfaDegistir('istatistikler')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'istatistikler' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">📊</span> İstatistikler
            </button>
            <button onClick={() => sayfaDegistir('sosyal')} className={`w-full flex items-center gap-3 px-4 py-3 mt-1 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'sosyal' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">⚯</span> Sosyal & Odalar
            </button>
            <button onClick={() => sayfaDegistir('ayarlar')} className={`w-full flex items-center gap-3 px-4 py-3 mt-1 rounded-2xl text-left text-sm transition-all cursor-pointer ${aktifSayfa === 'ayarlar' ? 'bg-white text-gray-900 font-semibold shadow-sm shadow-black/5 border border-black/5' : 'text-gray-500 hover:bg-black/5 hover:text-gray-800 font-normal'}`}>
              <span className="text-lg">⎔</span> Ayarlar
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 md:p-10 lg:p-14 overflow-y-auto min-h-screen">
        <Suspense fallback={<YukeIkonu />}>
          {aktifSayfa === 'anasayfa' && <AnaSayfa seciliModuller={seciliModuller} setAktifSayfa={sayfaDegistir} />}
          {aktifSayfa === 'ajanda'   && <Ajanda />}
          {aktifSayfa === 'takvim'   && <Takvim setAktifSayfa={sayfaDegistir} />}
          {aktifSayfa === 'gunluk'    && <GunlukDuzen />}
          {aktifSayfa === 'cilt'     && <CiltBakimi />}
          {aktifSayfa === 'izleme'   && <IzlemeOkuma />}
          {aktifSayfa === 'sinav'    && <SinavGorevleri />}
          {aktifSayfa === 'dongu'    && <Dongu />}
          {aktifSayfa === 'profil' && <Profil setAktifSayfa={sayfaDegistir} />}
          {aktifSayfa === 'maneviyat' && <Maneviyat />}
          {aktifSayfa === 'istatistikler' && <Istatistikler />}
          {aktifSayfa === 'sosyal' && <Sosyal />}
        </Suspense>

        {aktifSayfa === 'ayarlar' && (
          <div className="flex flex-col gap-8 max-w-2xl mx-auto">
            <Ayarlar />
            <div className="animate-fade-in bg-white/70 backdrop-blur-xl overflow-hidden rounded-[2rem] border border-black/5 shadow-sm">
              <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-black/5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center text-xl flex-shrink-0">
                  ◫
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Modül Yönetimi</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-light">
                    Menüde ve ana ekranda görünmesini istediğin modülleri aç ya da kapat.
                  </p>
                </div>
              </div>
              <div className="px-6 sm:px-8 py-6 flex flex-col gap-3">
                {Object.entries(MODULLER).map(([key, data]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl hover:border-black/10 transition-all shadow-sm shadow-black/[0.01]">
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">{data.icon}</span>
                      <span className="font-medium text-gray-800 text-sm">{data.ad}</span>
                    </div>
                    <button
                      onClick={() => toggleModul(key)}
                      className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${seciliModuller[key] ? 'bg-gray-900' : 'bg-gray-200'}`}
                    >
                      <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${seciliModuller[key] ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI ASİSTAN */}
      <AiAsistan setAktifSayfa={sayfaDegistir} />
    </div>
  );
}

export default App;
