import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

// --- Confetti Mini ---
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      r: Math.random() * 6 + 3,
      color: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
    }));
    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(p.angle) * 1.5;
        p.angle += p.spin;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (particles.some(p => p.y < canvas.height + 20)) requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; };
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full z-20 rounded-3xl" />;
}

// --- XP Popup ---
function XpPopup({ show, xp }) {
  return show ? (
    <div className="absolute top-2 right-2 z-30 animate-bounce-once">
      <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
        +{xp} XP ✨
      </span>
    </div>
  ) : null;
}

export default function Ajanda() {
  const getLocalDateStr = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateStr(new Date());
  const [seciliTarih, setSeciliTarih] = useState(todayStr);

  const [habits, setHabits] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [examTasks, setExamTasks] = useState([]);
  const [yeniGorev, setYeniGorev] = useState('');
  const [loading, setLoading] = useState(true);

  // Gamification states
  const [confettiTask, setConfettiTask] = useState(null);
  const [xpPopup, setXpPopup] = useState({ taskId: null, show: false });
  const [streak, setStreak] = useState(0);

  const isGelecekGun = seciliTarih > todayStr;
  const _isGecmisGun = seciliTarih < todayStr;

  const userId = getCurrentUserId();

  const verileriGetir = async () => {
    setLoading(true);
    try {
      // 1. Alışkanlıklar
      const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
      const habitsSnap = await getDocs(habitsQuery);
      const habitsData = habitsSnap.docs.map(doc => {
        const data = doc.data();
        const tarihler = data.tamamlananTarihler ? data.tamamlananTarihler.split(',').filter(Boolean) : [];
        return {
          id: doc.id,
          ...data,
          tarihler,
          tamamlandi: tarihler.includes(seciliTarih)
        };
      });
      setHabits(habitsData);

      // 2. Günlük Görevler (Ajanda)
      const dailyQuery = query(collection(db, 'dailyTasks'), where('userId', '==', userId), where('tarih', '==', seciliTarih));
      const dailySnap = await getDocs(dailyQuery);
      setDailyTasks(dailySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Sınav/Ders Görevleri
      const examQuery = query(collection(db, 'tasks'), where('userId', '==', userId), where('tarih', '==', seciliTarih));
      const examSnap = await getDocs(examQuery);
      setExamTasks(examSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
    } catch (error) {
      console.error("Veriler çekilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verileriGetir();
  }, [seciliTarih]);

  // Streak hesapla
  useEffect(() => {
    if (dailyTasks.length === 0) return;
    const completed = dailyTasks.filter(t => t.tamamlandi).length;
    const total = dailyTasks.length;
    if (total > 0 && completed === total) {
      const savedStreak = parseInt(localStorage.getItem('ajanda_streak') || '0');
      const lastCompleted = localStorage.getItem('ajanda_last_completed');
      if (lastCompleted !== todayStr) {
        const newStreak = lastCompleted === getLocalDateStr(new Date(Date.now() - 86400000)) ? savedStreak + 1 : 1;
        localStorage.setItem('ajanda_streak', String(newStreak));
        localStorage.setItem('ajanda_last_completed', todayStr);
        setStreak(newStreak);
      } else {
        setStreak(savedStreak);
      }
    } else {
      setStreak(parseInt(localStorage.getItem('ajanda_streak') || '0'));
    }
  }, [dailyTasks]);

  const [animClass, setAnimClass] = useState('');

  // Müzikal, hoş swipe sesi
  const playPageTurnSound = (direction) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      // Hoş bir "whoosh" tonu
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      // Sola geçişte aşağıdan yukarı, sağa geçişte yukarıdan aşağı sweep
      const startFreq = direction === 'left' ? 180 : 280;
      const endFreq = direction === 'left' ? 320 : 160;
      
      osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.18);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      
      // Hafif reverb için ikinci osc
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(startFreq * 1.5, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.5, audioCtx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.28);
    } catch (e) {
      console.warn("Audio error", e);
    }
  };

  // Görev tamamlama sesi (başarı tonu)
  const playCompleteSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 - majör akor
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + i * 0.08 + 0.35);
      });
    } catch (e) {}
  };

  const triggerAnim = (direction) => {
    playPageTurnSound(direction);
    setAnimClass(direction === 'left' ? 'animate-page-turn-left' : 'animate-page-turn-right');
    setTimeout(() => {
      setAnimClass('');
    }, 400); 
  };

  const oncekiGun = () => {
    triggerAnim('left');
    const d = new Date(seciliTarih);
    d.setDate(d.getDate() - 1);
    setSeciliTarih(getLocalDateStr(d));
  };

  const sonrakiGun = () => {
    triggerAnim('right');
    const d = new Date(seciliTarih);
    d.setDate(d.getDate() + 1);
    setSeciliTarih(getLocalDateStr(d));
  };

  const formatDateLabel = (dateStr) => {
    if (dateStr === todayStr) return "Bugün";
    
    const d = new Date(dateStr);
    const today = new Date(todayStr);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    
    if (diff === 1) return "Yarın";
    if (diff === -1) return "Dün";

    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return `${d.getDate()} ${aylar[d.getMonth()]}`;
  };

  const gorevEkle = async () => {
    if (!yeniGorev.trim()) return;
    
    const yeniVeri = {
      userId,
      tarih: seciliTarih,
      baslik: yeniGorev.trim(),
      tamamlandi: false
    };

    try {
      const docRef = await addDoc(collection(db, 'dailyTasks'), yeniVeri);
      setDailyTasks([...dailyTasks, { ...yeniVeri, id: docRef.id }]);
      setYeniGorev('');
    } catch (error) {
      console.error("Görev eklenemedi:", error);
    }
  };

  const toggleDailyTask = async (task) => {
    // Gelecek günler için engel
    if (isGelecekGun) return;
    
    const guncelBitti = !task.tamamlandi;
    setDailyTasks(prev => prev.map(t => t.id === task.id ? { ...t, tamamlandi: guncelBitti } : t));
    
    // Gamification: tamamlandıysa
    if (guncelBitti) {
      playCompleteSound();
      setConfettiTask(task.id);
      setXpPopup({ taskId: task.id, show: true });
      setTimeout(() => setConfettiTask(null), 2500);
      setTimeout(() => setXpPopup({ taskId: null, show: false }), 2000);
    }
    
    try {
      await updateDoc(doc(db, 'dailyTasks', task.id), { tamamlandi: guncelBitti });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExamTask = async (task) => {
    if (isGelecekGun) return;
    
    const guncelBitti = !task.bitti;
    setExamTasks(prev => prev.map(t => t.id === task.id ? { ...t, bitti: guncelBitti } : t));
    
    if (guncelBitti) {
      playCompleteSound();
    }
    
    try {
      await updateDoc(doc(db, 'tasks', task.id), { bitti: guncelBitti });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleHabit = async (habit) => {
    if (isGelecekGun) return;
    
    const yeniTarihler = habit.tamamlandi
      ? habit.tarihler.filter(t => t !== seciliTarih)
      : [...habit.tarihler, seciliTarih];

    setHabits(prev => prev.map(h => h.id === habit.id ? { 
      ...h, 
      tarihler: yeniTarihler, 
      tamamlandi: !habit.tamamlandi 
    } : h));

    if (!habit.tamamlandi) {
      playCompleteSound();
      setConfettiTask(`habit_${habit.id}`);
      setTimeout(() => setConfettiTask(null), 2000);
    }

    try {
      await updateDoc(doc(db, 'habits', habit.id), {
        tamamlananTarihler: yeniTarihler.join(',')
      });
    } catch (error) { 
      console.error(error); 
    }
  };

  const silDailyTask = async (id) => {
    if (window.confirm('Görevi silmek istediğine emin misin?')) {
      setDailyTasks(prev => prev.filter(t => t.id !== id));
      try {
        await deleteDoc(doc(db, 'dailyTasks', id));
      } catch (error) { console.error(error); }
    }
  };

  // Görev istatistikleri
  const tamamlananGorev = dailyTasks.filter(t => t.tamamlandi).length;
  const toplamGorev = dailyTasks.length;
  const ilerlemeYuzde = toplamGorev > 0 ? Math.round((tamamlananGorev / toplamGorev) * 100) : 0;
  const tumunuBitti = toplamGorev > 0 && tamamlananGorev === toplamGorev;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* BAŞLIK VE TARİH SEÇİCİ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 border-b border-black/5 pb-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal flex items-center gap-3">
            Ajanda
            {streak > 0 && (
              <span className="text-sm font-sans font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full animate-pulse">
                🔥 {streak} günlük seri
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 font-light font-sans">
            Tüm rutinlerin, görevlerin ve hedeflerin tek bir ekranda.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-stretch sm:self-auto bg-white/60 p-2 rounded-2xl border border-black/5 shadow-xs">
          <button onClick={oncekiGun} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="relative flex flex-col items-center">
            <input 
              type="date" 
              value={seciliTarih}
              onChange={(e) => {
                const oldDate = new Date(seciliTarih);
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate)) {
                  triggerAnim(newDate > oldDate ? 'right' : 'left');
                  setSeciliTarih(e.target.value);
                }
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-800 shadow-sm cursor-pointer hover:border-indigo-300 focus:outline-none focus:border-indigo-400 transition-colors w-32 text-center"
              id="date-picker"
            />
          </div>
          <button onClick={sonrakiGun} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Gelecek gün uyarısı */}
      {isGelecekGun && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-amber-700 text-sm font-medium">
          <span className="text-lg">🔮</span>
          <span><strong>{formatDateLabel(seciliTarih)}</strong> için görevleri görebilirsin, ama henüz işaretleyemezsin.</span>
        </div>
      )}

      {/* İLERLEME ÇUBUĞU (sadece bugün için) */}
      {!isGelecekGun && toplamGorev > 0 && (
        <div className={`bg-white/80 backdrop-blur-xl p-4 rounded-2xl border shadow-sm transition-all ${tumunuBitti ? 'border-emerald-200 bg-emerald-50/50' : 'border-black/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600">
              {formatDateLabel(seciliTarih)} Günlük İlerleme
            </span>
            <div className="flex items-center gap-2">
              {tumunuBitti && <span className="text-xs font-bold text-emerald-600">🎉 Tüm Görevler Tamam!</span>}
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                {tamamlananGorev}/{toplamGorev} görev
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-black/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${tumunuBitti ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-indigo-400 to-purple-500'}`}
              style={{ width: `${ilerlemeYuzde}%` }}
            />
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${animClass} ${loading ? 'opacity-40 blur-sm pointer-events-none' : 'opacity-100 blur-0'}`}>
          
          {/* SOL SÜTUN: GÜNLÜK GÖREVLER */}
          <div className="space-y-6">
            
            <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  {formatDateLabel(seciliTarih)} Yapılacaklar
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">
                  {dailyTasks.filter(t => t.tamamlandi).length} / {dailyTasks.length}
                </span>
              </div>
              
              {/* Sadece bugün ve geçmiş için görev ekleme göster */}
              {!isGelecekGun && (
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={yeniGorev}
                    onChange={(e) => setYeniGorev(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && gorevEkle()}
                    placeholder="Güne yeni bir görev ekle..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-indigo-400"
                  />
                  <button onClick={gorevEkle} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-xs">
                    Ekle
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {dailyTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">Bu tarih için eklenmiş görev yok.</p>
                ) : (
                  dailyTasks.map(task => (
                    <div
                      key={task.id}
                      className={`relative flex items-center justify-between p-3 rounded-2xl border transition group overflow-hidden
                        ${task.tamamlandi ? 'bg-emerald-50/50 border-emerald-100' : 'border-gray-100 hover:bg-gray-50'}
                        ${isGelecekGun ? 'opacity-70' : ''}
                      `}
                    >
                      {/* Confetti overlay */}
                      <Confetti active={confettiTask === task.id} />
                      {/* XP popup */}
                      <XpPopup show={xpPopup.taskId === task.id && xpPopup.show} xp={15} />
                      
                      <div className="flex items-center gap-3 relative z-10">
                        <button
                          onClick={() => !isGelecekGun && toggleDailyTask(task)}
                          disabled={isGelecekGun}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                            ${task.tamamlandi
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : isGelecekGun
                              ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                              : 'bg-white border-gray-300 hover:border-indigo-400 cursor-pointer'
                            }`}
                        >
                          {task.tamamlandi && <span className="text-xs font-bold">✓</span>}
                          {isGelecekGun && !task.tamamlandi && <span className="text-[9px] text-gray-400">🔒</span>}
                        </button>
                        <span className={`text-sm transition-all ${task.tamamlandi ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                          {task.baslik}
                        </span>
                      </div>
                      {!isGelecekGun && (
                        <button onClick={() => silDailyTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs relative z-10">
                          🗑️
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sınav Görevleri (Eğer Varsa) */}
            {examTasks.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-lg">📚</span> Sınav & Ders Çalışmaları
                  </h3>
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg font-bold">
                    {examTasks.filter(t => t.bitti).length} / {examTasks.length}
                  </span>
                </div>
                
                {isGelecekGun && (
                  <p className="text-[11px] text-amber-500 mb-3 font-medium">🔮 Gelecek gün — yalnızca görüntüleme modu</p>
                )}
                
                <div className="space-y-2">
                  {examTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${task.bitti ? 'bg-amber-50/50 border-amber-100' : 'border-amber-100 bg-amber-50/30'}`}>
                      <button
                        onClick={() => !isGelecekGun && toggleExamTask(task)}
                        disabled={isGelecekGun}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition
                          ${task.bitti ? 'bg-amber-500 border-amber-500 text-white' : isGelecekGun ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-white border-amber-300 cursor-pointer hover:border-amber-500'}`}
                      >
                        {task.bitti && <span className="text-[9px] font-bold">✓</span>}
                        {isGelecekGun && !task.bitti && <span className="text-[8px] text-gray-400">🔒</span>}
                      </button>
                      <span className={`text-sm ${task.bitti ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                        {task.gorev}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SAĞ SÜTUN: ALIŞKANLIKLAR */}
          <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-sm flex flex-col h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="text-lg">❖</span> Günlük Rutinler
              </h3>
              <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">
                {habits.filter(h => h.tamamlandi).length} / {habits.length}
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 mb-4 font-light">
              Bu listedeki öğeler "Günlük Düzen" modülünden gelir ve her gün tekrar eder.
            </p>

            {isGelecekGun && (
              <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <span>🔮</span>
                <span className="text-[11px] text-amber-600 font-medium">Gelecek günler işaretlenemez</span>
              </div>
            )}

            <div className="space-y-3">
              {habits.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">Tanımlanmış alışkanlığınız yok.</p>
              ) : (
                habits.map(habit => (
                  <div 
                    key={habit.id}
                    className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition overflow-hidden
                      ${habit.tamamlandi ? 'bg-green-50/50 border-green-200' : 'bg-gray-50/50 border-gray-100'}
                      ${isGelecekGun ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}
                    `}
                    onClick={() => toggleHabit(habit)}
                  >
                    <Confetti active={confettiTask === `habit_${habit.id}`} />
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-colors shrink-0 ${habit.tamamlandi ? 'bg-green-500 border-green-500 text-white' : isGelecekGun ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-300'}`}>
                      {habit.tamamlandi && <span className="text-sm font-bold">✓</span>}
                      {isGelecekGun && !habit.tamamlandi && <span className="text-[10px] text-gray-400">🔒</span>}
                    </div>
                    <div className="relative z-10">
                      <h4 className={`text-sm font-medium ${habit.tamamlandi ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {habit.ikon} {habit.baslik}
                      </h4>
                      {habit.seri > 0 && seciliTarih === todayStr && (
                        <p className="text-[10px] text-orange-500 font-bold mt-0.5">
                          🔥 {habit.seri} gün seri
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
    </div>
  );
}
