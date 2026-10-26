import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

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

  const [animClass, setAnimClass] = useState('');

  const playPageTurnSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const gainNode = audioCtx.createGain();
      // Fast attack, smooth decay for a "swipe" sound
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      noise.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      noise.start();
    } catch (e) {
      console.warn("Audio error", e);
    }
  };

  const triggerAnim = (direction) => {
    playPageTurnSound();
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
    const guncelBitti = !task.tamamlandi;
    setDailyTasks(prev => prev.map(t => t.id === task.id ? { ...t, tamamlandi: guncelBitti } : t));
    
    try {
      await updateDoc(doc(db, 'dailyTasks', task.id), { tamamlandi: guncelBitti });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExamTask = async (task) => {
    const guncelBitti = !task.bitti;
    setExamTasks(prev => prev.map(t => t.id === task.id ? { ...t, bitti: guncelBitti } : t));
    
    try {
      await updateDoc(doc(db, 'tasks', task.id), { bitti: guncelBitti });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleHabit = async (habit) => {
    const yeniTarihler = habit.tamamlandi
      ? habit.tarihler.filter(t => t !== seciliTarih)
      : [...habit.tarihler, seciliTarih];

    setHabits(prev => prev.map(h => h.id === habit.id ? { 
      ...h, 
      tarihler: yeniTarihler, 
      tamamlandi: !habit.tamamlandi 
    } : h));

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* BAŞLIK VE TARİH SEÇİCİ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 border-b border-black/5 pb-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-serif text-gray-900 mb-1 font-normal">
            Ajanda
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

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${animClass} ${loading ? 'opacity-40 blur-sm pointer-events-none' : 'opacity-100 blur-0'}`}>
          
          {/* SOL SÜTUN: GÜNLÜK GÖREVLER */}
          <div className="space-y-6">
            
            <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🎯</span> Bugün Yapılacaklar
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">
                  {dailyTasks.filter(t => t.tamamlandi).length} / {dailyTasks.length}
                </span>
              </div>
              
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

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {dailyTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4 italic">Bu tarih için eklenmiş görev yok.</p>
                ) : (
                  dailyTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition group">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={task.tamamlandi}
                          onChange={() => toggleDailyTask(task)}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <span className={`text-sm ${task.tamamlandi ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                          {task.baslik}
                        </span>
                      </div>
                      <button onClick={() => silDailyTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs">
                        🗑️
                      </button>
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
                
                <div className="space-y-2">
                  {examTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl border border-amber-100 bg-amber-50/30">
                      <input 
                        type="checkbox" 
                        checked={task.bitti}
                        onChange={() => toggleExamTask(task)}
                        className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                      />
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
                <span className="text-lg">❖</span> Günlük Rutinler (Alışkanlıklar)
              </h3>
              <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">
                {habits.filter(h => h.tamamlandi).length} / {habits.length}
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 mb-4 font-light">
              Bu listedeki öğeler "Günlük Düzen" modülünden gelir ve her gün tekrar eder.
            </p>

            <div className="space-y-3">
              {habits.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 italic">Tanımlanmış alışkanlığınız yok.</p>
              ) : (
                habits.map(habit => (
                  <div 
                    key={habit.id} 
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition cursor-pointer ${habit.tamamlandi ? 'bg-green-50/50 border-green-200' : 'bg-gray-50/50 border-gray-100 hover:border-gray-300'}`}
                    onClick={() => toggleHabit(habit)}
                  >
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-colors ${habit.tamamlandi ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300'}`}>
                      {habit.tamamlandi && <span className="text-sm font-bold">✓</span>}
                    </div>
                    <div>
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
