/**
 * Aura Life-OS Ortak Yardımcı Fonksiyonları
 */

/**
 * Yerel saat dilimine göre YYYY-MM-DD formatında tarih dizesi döner.
 * @param {Date|string|number} date 
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateStr(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Toplam XP puanına göre kullanıcının seviyesini hesaplar.
 * Her 500 XP'de 1 seviye atlanır (minimum 1. seviye).
 * @param {number} totalXp 
 * @returns {number}
 */
export function calculateLevel(totalXp = 0) {
  if (totalXp < 0) return 1;
  return Math.floor(totalXp / 500) + 1;
}

/**
 * Mevcut seviye içindeki XP ilerleme yüzdesini (0-100) döner.
 * @param {number} totalXp 
 * @returns {number}
 */
export function calculateLevelProgress(totalXp = 0) {
  if (totalXp <= 0) return 0;
  const currentLevelXp = totalXp % 500;
  return Math.min(100, (currentLevelXp / 500) * 100);
}
