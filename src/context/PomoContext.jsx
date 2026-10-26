import React, { createContext, useState, useEffect, useContext } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getCurrentUserId } from '../firebase';

const PomoContext = createContext();

export function PomoProvider({ children }) {
  const [pomoMod, setPomoMod] = useState('bosta'); // 'bosta', 'calisiyor', 'duraklatildi', 'mola_bekliyor', 'mola'
  const [pomoSure, setPomoSure] = useState(25 * 60);
  const [tamamlananPomo, setTamamlananPomo] = useState(0);
  const [aktifSinav, setAktifSinav] = useState('');

  // Saniye sayacı ve Bildirim / Tarayıcı Sekmesi
  useEffect(() => {
    let interval;
    if (pomoMod === 'calisiyor' || pomoMod === 'mola') {
      interval = setInterval(() => {
        setPomoSure(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (pomoMod === 'duraklatildi' || pomoMod === 'bosta') {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [pomoMod]);

  // Süre bittiğinde bildirim gönder ve durumu değiştir
  useEffect(() => {
    if (pomoSure === 0) {
      if (pomoMod === 'calisiyor') {
        setTamamlananPomo(p => p + 1);
        setPomoMod('mola_bekliyor');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Aura: Odaklanma Bitti!', {
            body: 'Harika bir iş çıkardın. Şimdi biraz mola verme vakti.',
            icon: '/icons/icon-192x192.png'
          });
        }
      } else if (pomoMod === 'mola') {
        setPomoMod('bosta');
        setPomoSure(25 * 60);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Aura: Mola Bitti!', {
            body: 'Mola süresi doldu. Yeni bir göreve odaklanmaya hazır mısın?',
            icon: '/icons/icon-192x192.png'
          });
        }
      }
    }
    
    // Sekme başlığını güncelle
    if (pomoMod === 'calisiyor' || pomoMod === 'mola') {
      const m = Math.floor(pomoSure / 60).toString().padStart(2, '0');
      const s = (pomoSure % 60).toString().padStart(2, '0');
      document.title = `(${m}:${s}) Aura`;
    } else {
      document.title = 'Aura Life-OS';
    }
  }, [pomoSure, pomoMod]);

  // Firebase profil çalışma durumunu güncelle (Sosyal tarafı için)
  useEffect(() => {
    const guncelle = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;
      try {
        await updateDoc(doc(db, 'profiles', userId), {
          isStudying: pomoMod === 'calisiyor',
          studySubject: pomoMod === 'calisiyor' ? aktifSinav : null
        });
      } catch (e) {
        // Hata durumunu yoksay, profil henüz oluşmamış olabilir
      }
    };
    guncelle();
  }, [pomoMod, aktifSinav]);

  const value = {
    pomoMod, setPomoMod,
    pomoSure, setPomoSure,
    tamamlananPomo, setTamamlananPomo,
    aktifSinav, setAktifSinav
  };

  return (
    <PomoContext.Provider value={value}>
      {children}
    </PomoContext.Provider>
  );
}

export const usePomo = () => useContext(PomoContext);
