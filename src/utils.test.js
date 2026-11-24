import { describe, it, expect } from 'vitest';
import { getLocalDateStr, calculateLevel, calculateLevelProgress } from './utils';

describe('Aura Life-OS Utils Testleri', () => {
  describe('getLocalDateStr', () => {
    it('Verilen tarihi YYYY-MM-DD formatında döndürmeli', () => {
      const fixedDate = new Date(2026, 9, 26); // 26 Ekim 2026
      expect(getLocalDateStr(fixedDate)).toBe('2026-10-26');
    });

    it('Tek haneli ay ve günleri sıfırla doldurmalı (padStart)', () => {
      const singleDigitDate = new Date(2026, 0, 5); // 5 Ocak 2026
      expect(getLocalDateStr(singleDigitDate)).toBe('2026-01-05');
    });
  });

  describe('calculateLevel', () => {
    it('0 veya negatif XP için Seviye 1 dönmeli', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(-50)).toBe(1);
    });

    it('499 XP için Seviye 1 dönmeli', () => {
      expect(calculateLevel(499)).toBe(1);
    });

    it('500 XP için Seviye 2 dönmeli', () => {
      expect(calculateLevel(500)).toBe(2);
    });

    it('1250 XP için Seviye 3 dönmeli', () => {
      expect(calculateLevel(1250)).toBe(3);
    });
  });

  describe('calculateLevelProgress', () => {
    it('0 XP için %0 dönmeli', () => {
      expect(calculateLevelProgress(0)).toBe(0);
    });

    it('250 XP için %50 dönmeli', () => {
      expect(calculateLevelProgress(250)).toBe(50);
    });

    it('750 XP için seviye içi %50 dönmeli (750 % 500 = 250)', () => {
      expect(calculateLevelProgress(750)).toBe(50);
    });
  });
});
