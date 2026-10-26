import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, updateDoc, arrayUnion, setDoc, deleteDoc, where } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

export default function Sosyal() {
  const [arkadaslar, setArkadaslar] = useState([]);
  const [gelenIstekler, setGelenIstekler] = useState([]);
  const [gonderilenIstekler, setGonderilenIstekler] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaSonucu, setAramaSonucu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kullaniciVerisi, setKullaniciVerisi] = useState(null);
  
  const userId = getCurrentUserId();

  useEffect(() => {
    if (userId) {
      arkadaslariGetir();
      istekleriGetir();
    }
  }, [userId]);

  const arkadaslariGetir = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'profiles', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setKullaniciVerisi({ id: userDoc.id, ...userData });
        
        const friendIds = userData.friends || [];
        if (friendIds.length > 0) {
          const friendData = [];
          for (let fid of friendIds) {
            const fDoc = await getDoc(doc(db, 'profiles', fid));
            if (fDoc.exists()) {
              friendData.push({ id: fDoc.id, ...fDoc.data() });
            }
          }
          setArkadaslar(friendData);
        }
      }
    } catch (e) {
      console.error("Arkadaş listesi çekilemedi", e);
    }
  };

  const istekleriGetir = async () => {
    try {
      const qGelen = query(collection(db, 'friend_requests'), where('to', '==', userId), where('status', '==', 'pending'));
      const snapGelen = await getDocs(qGelen);
      const gelenData = [];
      for (let d of snapGelen.docs) {
        const reqData = d.data();
        const fDoc = await getDoc(doc(db, 'profiles', reqData.from));
        if (fDoc.exists()) {
          gelenData.push({ reqId: d.id, ...fDoc.data(), ...reqData });
        }
      }
      setGelenIstekler(gelenData);

      const qGiden = query(collection(db, 'friend_requests'), where('from', '==', userId), where('status', '==', 'pending'));
      const snapGiden = await getDocs(qGiden);
      setGonderilenIstekler(snapGiden.docs.map(d => d.data().to));
    } catch (e) {
      console.error("İstekler çekilemedi", e);
    }
  };

  const arkadasAra = async (e) => {
    e.preventDefault();
    if (!aramaMetni) return;
    setLoading(true);
    setAramaSonucu(null);
    try {
      const q = query(collection(db, 'profiles'));
      const snapshot = await getDocs(q);
      
      let sonuclar = [];
      const searchLower = aramaMetni.toLowerCase();
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id === userId) return;
        
        const emailMatch = data.email && data.email.toLowerCase().includes(searchLower);
        const nameMatch = data.isim && data.isim.toLowerCase().includes(searchLower);
        
        if (emailMatch || nameMatch) {
          sonuclar.push({ id: docSnap.id, ...data });
        }
      });
      
      if (sonuclar.length > 0) {
        setAramaSonucu(sonuclar);
      } else {
        setAramaSonucu('Bulunamadi');
      }
    } catch (error) {
      console.error("Kullanıcı arama hatası", error);
    } finally {
      setLoading(false);
    }
  };

  const arkadasEkle = async (hedefId) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'friend_requests', `${userId}_${hedefId}`), {
        from: userId,
        to: hedefId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert("Arkadaşlık isteği gönderildi!");
      istekleriGetir();
    } catch (e) {
      console.error("Arkadaşlık isteği gönderilemedi", e);
      alert("Hata oluştu.");
    }
  };

  const istekKabulEt = async (reqId, fromId) => {
    try {
      await updateDoc(doc(db, 'profiles', userId), {
        friends: arrayUnion(fromId)
      });
      await updateDoc(doc(db, 'profiles', fromId), {
        friends: arrayUnion(userId)
      });
      await deleteDoc(doc(db, 'friend_requests', reqId));
      istekleriGetir();
      arkadaslariGetir();
    } catch (e) {
      console.error("Kabul edilemedi", e);
    }
  };

  const istekReddet = async (reqId) => {
    try {
      await deleteDoc(doc(db, 'friend_requests', reqId));
      istekleriGetir();
    } catch (e) {
      console.error("Reddedilemedi", e);
    }
  };

  const calisanArkadaslar = arkadaslar.filter(a => a.isStudying);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* ÜST BAŞLIK */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 text-9xl -mt-4 -mr-4 pointer-events-none">👥</div>
        <h1 className="text-3xl sm:text-4xl font-serif mb-2 relative z-10">Aura Topluluğu</h1>
        <p className="text-blue-100 font-light relative z-10">Arkadaşlarınla birlikte geliş, rekabet et ve odak odalarında buluş.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SOL KOLON: Arama ve Arkadaş Listesi */}
        <div className="md:col-span-2 space-y-6">
          
          {/* ARKADAŞ EKLE */}
          <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-serif text-gray-800 mb-4">Arkadaş Bul</h3>
            <form onSubmit={arkadasAra} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Arkadaşının adı veya e-posta adresi..." 
                value={aramaMetni}
                onChange={e => setAramaMetni(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Aranıyor...' : 'Ara'}
              </button>
            </form>

            {Array.isArray(aramaSonucu) && aramaSonucu.length > 0 && (
              <div className="space-y-3 mt-4">
                {aramaSonucu.map(kisi => (
                  <div key={kisi.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      {kisi.avatarUrl ? (
                        <img src={kisi.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-blue-200 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">
                          {kisi.isim ? kisi.isim[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800">{kisi.isim}</p>
                        <p className="text-[10px] text-gray-500">Seviye {kisi.level || 1} • {kisi.xp || 0} XP</p>
                      </div>
                    </div>
                    {arkadaslar.find(a => a.id === kisi.id) ? (
                      <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded-full">Ekli</span>
                    ) : gonderilenIstekler.includes(kisi.id) ? (
                      <span className="px-4 py-1.5 bg-gray-100 text-gray-500 font-bold text-xs rounded-full">İstek Gönderildi</span>
                    ) : (
                      <button 
                        onClick={() => arkadasEkle(kisi.id)}
                        className="px-4 py-1.5 bg-white text-blue-600 font-bold text-xs rounded-full border border-blue-200 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                      >
                        İstek Gönder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {aramaSonucu === 'Bulunamadi' && (
              <p className="text-xs text-red-500 mt-2">Bu kelimeyle eşleşen Aura kullanıcısı bulunamadı.</p>
            )}
          </div>

          {/* GELEN İSTEKLER */}
          {gelenIstekler.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-serif text-gray-800 mb-4">Gelen Arkadaşlık İstekleri ({gelenIstekler.length})</h3>
              <div className="space-y-3">
                {gelenIstekler.map(req => (
                  <div key={req.reqId} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      {req.avatarUrl ? (
                        <img src={req.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full border border-yellow-200 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 font-bold">
                          {req.isim ? req.isim[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800">{req.isim}</p>
                        <p className="text-[10px] text-gray-500">Arkadaş olmak istiyor</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => istekKabulEt(req.reqId, req.from)}
                        className="px-4 py-1.5 bg-green-600 text-white font-bold text-xs rounded-full hover:bg-green-700 transition cursor-pointer"
                      >
                        Kabul Et
                      </button>
                      <button 
                        onClick={() => istekReddet(req.reqId)}
                        className="px-4 py-1.5 bg-red-100 text-red-600 font-bold text-xs rounded-full hover:bg-red-200 transition cursor-pointer"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ARKADAŞ LİSTESİ */}
          <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-serif text-gray-800 mb-4">Arkadaşların ({arkadaslar.length})</h3>
            
            {arkadaslar.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <span className="text-3xl block mb-2 opacity-50">🌱</span>
                <p className="text-sm">Henüz bir arkadaşın yok.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {arkadaslar.map(ark => (
                  <div key={ark.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {ark.avatarUrl ? (
                        <img src={ark.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full border border-gray-200 object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold text-lg">
                          {ark.isim ? ark.isim[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{ark.isim}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          Lvl {ark.level} • {ark.xp} XP
                        </p>
                      </div>
                    </div>
                    
                    {/* Arkadaşın Rozetleri */}
                    <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                      {ark.kazanilanRozetler ? (
                        ark.kazanilanRozetler.split(',').slice(0, 5).map(rId => (
                          <span key={rId} className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs" title="Rozet">🏆</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400">Rozeti yok</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SAĞ KOLON: Liderlik Tablosu ve Çalışma Odaları */}
        <div className="space-y-6">
          
          {/* LİDERLİK TABLOSU */}
          <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -top-6 -right-6 text-6xl opacity-10">🏆</div>
            <h3 className="text-lg font-serif text-gray-800 mb-4 relative z-10 flex items-center gap-2">
              <span>Liderlik Tablosu</span>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md font-sans font-bold">Deneyim (XP)</span>
            </h3>
            
            <div className="space-y-3 relative z-10">
              {(() => {
                const tumListe = kullaniciVerisi ? [kullaniciVerisi, ...arkadaslar] : arkadaslar;
                const sirali = [...tumListe].sort((a, b) => (b.xp || 0) - (a.xp || 0));
                
                return sirali.map((kisi, index) => (
                  <div key={kisi.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${kisi.id === userId ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-white shadow-md' : index === 1 ? 'bg-gray-300 text-white shadow-sm' : index === 2 ? 'bg-orange-300 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${kisi.id === userId ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {kisi.id === userId ? 'Sen' : kisi.isim}
                        </p>
                        <p className="text-[10px] text-gray-500">Seviye {kisi.level || 1}</p>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-indigo-600 bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-xs">
                      {kisi.xp || 0} XP
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* ÇALIŞMA ODALARI */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 shadow-xl border border-indigo-500/30 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg font-serif">Çalışma Odaları</h3>
              <span className="relative flex h-3 w-3">
                {calisanArkadaslar.length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>

            {calisanArkadaslar.length === 0 ? (
              <div className="text-center py-6 text-indigo-200">
                <span className="text-3xl block mb-2 opacity-50">😴</span>
                <p className="text-xs font-light">Şu an odak odasında kimse yok. İlk başlayan sen ol!</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {calisanArkadaslar.map(ark => (
                  <div key={ark.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 flex items-center gap-3">
                    <div className="relative">
                      {ark.avatarUrl ? (
                        <img src={ark.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {ark.isim ? ark.isim[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-indigo-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{ark.isim}</p>
                      <p className="text-[10px] text-indigo-200">Odaklanıyor: {ark.studySubject || 'Görev'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
