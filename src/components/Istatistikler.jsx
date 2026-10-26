import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';

export default function Istatistikler() {
  const [loading, setLoading] = useState(true);
  const [habitData, setHabitData] = useState([]);
  const [taskData, setTaskData] = useState([]);
  const [toplamAliskanlik, setToplamAliskanlik] = useState(0);

  const getLocalDateStr = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().split('T')[0];
  };

  useEffect(() => {
    const veriCek = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Son 7 günü hazırla
        const son7Gun = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          son7Gun.push(getLocalDateStr(d));
        }

        // Alışkanlıklar
        const habitsQuery = query(collection(db, 'habits'), where('userId', '==', userId));
        const habitsSnap = await getDocs(habitsQuery);
        let toplamAliskanlikSayisi = habitsSnap.docs.length;
        setToplamAliskanlik(toplamAliskanlikSayisi);

        const habitChartData = son7Gun.map(tarih => {
          let tamamlanan = 0;
          habitsSnap.forEach(doc => {
            const data = doc.data();
            const tarihler = data.tamamlananTarihler ? data.tamamlananTarihler.split(',') : [];
            if (tarihler.includes(tarih)) tamamlanan++;
          });
          const gunIsmi = new Date(tarih).toLocaleDateString('tr-TR', { weekday: 'short' });
          return { name: gunIsmi, tamamlanan, toplam: toplamAliskanlikSayisi, tarih };
        });
        setHabitData(habitChartData);

        // Görevler (dailyTasks) - sadece son 7 gündeki görevleri çekelim
        // where('tarih', 'in', son7Gun) yapmak için listeyi 10'arlı bölmek gerekebilir, ama basitçe client-side filtreleyelim veya tarih >= son 7 gün başlangıcı yapalım.
        const tasksQuery = query(collection(db, 'dailyTasks'), where('userId', '==', userId));
        const tasksSnap = await getDocs(tasksQuery);
        
        const taskChartData = son7Gun.map(tarih => {
          let toplamGorev = 0;
          let tamamlananGorev = 0;
          tasksSnap.forEach(doc => {
            const data = doc.data();
            if (data.tarih === tarih) {
              toplamGorev++;
              if (data.tamamlandi) tamamlananGorev++;
            }
          });
          const gunIsmi = new Date(tarih).toLocaleDateString('tr-TR', { weekday: 'short' });
          return { name: gunIsmi, tamamlanan: tamamlananGorev, toplam: toplamGorev, tarih };
        });
        setTaskData(taskChartData);

      } catch (err) {
        console.error("İstatistikler çekilemedi:", err);
      } finally {
        setLoading(false);
      }
    };

    veriCek();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-2 md:p-6 animate-pulse w-full max-w-5xl mx-auto opacity-60">
        <div className="h-24 bg-gray-200 rounded-[2.5rem] w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded-[2.5rem]"></div>
          <div className="h-64 bg-gray-200 rounded-[2.5rem]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-indigo-500/20 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight font-normal text-indigo-100">
              Gelişmiş İstatistikler
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-light max-w-xl">
              Son 7 günlük üretkenlik, alışkanlık ve görev performansın.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ALIŞKANLIKLAR GRAFİĞİ */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-indigo-500">📊</span> Alışkanlık Performansı
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                  contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                />
                <Bar dataKey="tamamlanan" fill="#6366f1" radius={[6, 6, 0, 0]} name="Tamamlanan Alışkanlık" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Toplam {toplamAliskanlik} aktif alışkanlık baz alınmıştır.
          </p>
        </div>

        {/* GÖREVLER GRAFİĞİ */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-black/5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-purple-500">📈</span> Görev Tamamlama Eğilimi
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGorev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                />
                <Area type="monotone" dataKey="tamamlanan" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorGorev)" name="Tamamlanan Görev" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Günlük eklenen ve bitirilen görev sayılarıdır.
          </p>
        </div>

      </div>
    </div>
  );
}
