import React from 'react';
import { Sun, Leaf, Wind, CloudRain, Calendar } from 'lucide-react';

export type SeasonType = 'spring' | 'summer' | 'fall' | 'winter' | 'other';

export interface SeasonThemeConfig {
  type: SeasonType;
  label: string;

  // Main Season Header & Card
  seasonIcon: React.ElementType;
  seasonIconBg: string;
  seasonIconColor: string;
  seasonTitleColor: string;
  seasonBadgeBg: string;
  seasonBadgeText: string;
  seasonCountText: string;
  seasonChevronColor: string;

  // Semesters inside Season
  semCardBorder: string;
  semHeaderBg: string;
  semIconBoxBg: string;
  semIconColor: string;
  semTitleColor: string;
  semBadgeBg: string;
  semBadgeText: string;
  semChevronColor: string;
  semSubjectIconBg: string;
  semSubjectIconColor: string;

  // Selector Button styling
  selectorBtnBg: string;
  selectorBtnBorder: string;
  selectorBtnText: string;
}

export function getSeasonType(name?: string | null): SeasonType {
  if (!name) return 'other';
  const lower = name.toLowerCase().trim();
  if (lower.includes('hè') || lower.includes('summer')) return 'summer';
  if (lower.includes('xuân') || lower.includes('spring')) return 'spring';
  if (lower.includes('thu') || lower.includes('fall') || lower.includes('autumn')) return 'fall';
  if (lower.includes('đông') || lower.includes('winter')) return 'winter';
  return 'other';
}

export function getSeasonTheme(seasonName?: string | null): SeasonThemeConfig {
  const type = getSeasonType(seasonName);

  switch (type) {
    case 'spring':
      return {
        type: 'spring',
        label: 'Mùa Xuân',
        seasonIcon: Leaf,
        seasonIconBg: 'bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs',
        seasonIconColor: 'text-emerald-600 dark:text-emerald-400',
        seasonTitleColor: 'text-emerald-950 dark:text-emerald-100 font-extrabold',
        seasonBadgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700',
        seasonBadgeText: 'text-emerald-800 dark:text-emerald-200 font-bold',
        seasonCountText: 'text-emerald-700 dark:text-emerald-300 font-bold',
        seasonChevronColor: 'text-emerald-600 dark:text-emerald-400',

        semCardBorder: 'border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-2xs',
        semHeaderBg: 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50',
        semIconBoxBg: 'bg-white dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700/80 shadow-2xs',
        semIconColor: 'text-emerald-600 dark:text-emerald-400',
        semTitleColor: 'text-emerald-900 dark:text-emerald-100 font-bold',
        semBadgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700',
        semBadgeText: 'text-emerald-800 dark:text-emerald-200 font-extrabold',
        semChevronColor: 'text-emerald-600 dark:text-emerald-400',
        semSubjectIconBg: 'bg-emerald-100/70 dark:bg-emerald-900/40',
        semSubjectIconColor: 'text-emerald-700 dark:text-emerald-300',

        selectorBtnBg: 'bg-emerald-50/70 dark:bg-emerald-950/50 hover:bg-emerald-100/70',
        selectorBtnBorder: 'border-emerald-300 dark:border-emerald-700',
        selectorBtnText: 'text-emerald-800 dark:text-emerald-200'
      };

    case 'summer':
      return {
        type: 'summer',
        label: 'Mùa Hạ',
        seasonIcon: Sun,
        seasonIconBg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 shadow-2xs',
        seasonIconColor: 'text-amber-600 dark:text-amber-400',
        seasonTitleColor: 'text-amber-950 dark:text-amber-100 font-extrabold',
        seasonBadgeBg: 'bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700',
        seasonBadgeText: 'text-amber-800 dark:text-amber-200 font-bold',
        seasonCountText: 'text-amber-700 dark:text-amber-300 font-bold',
        seasonChevronColor: 'text-amber-600 dark:text-amber-400',

        semCardBorder: 'border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600 shadow-2xs',
        semHeaderBg: 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/50 dark:hover:bg-amber-950/50',
        semIconBoxBg: 'bg-white dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700/80 shadow-2xs',
        semIconColor: 'text-amber-600 dark:text-amber-400',
        semTitleColor: 'text-amber-900 dark:text-amber-100 font-bold',
        semBadgeBg: 'bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-700',
        semBadgeText: 'text-amber-800 dark:text-amber-200 font-extrabold',
        semChevronColor: 'text-amber-600 dark:text-amber-400',
        semSubjectIconBg: 'bg-amber-100/70 dark:bg-amber-900/40',
        semSubjectIconColor: 'text-amber-700 dark:text-amber-300',

        selectorBtnBg: 'bg-amber-50/70 dark:bg-amber-950/50 hover:bg-amber-100/70',
        selectorBtnBorder: 'border-amber-300 dark:border-amber-700',
        selectorBtnText: 'text-amber-800 dark:text-amber-200'
      };

    case 'fall':
      return {
        type: 'fall',
        label: 'Mùa Thu',
        seasonIcon: Wind,
        seasonIconBg: 'bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 shadow-2xs',
        seasonIconColor: 'text-orange-600 dark:text-orange-400',
        seasonTitleColor: 'text-orange-950 dark:text-orange-100 font-extrabold',
        seasonBadgeBg: 'bg-orange-100 dark:bg-orange-900/60 border border-orange-300 dark:border-orange-700',
        seasonBadgeText: 'text-orange-800 dark:text-orange-200 font-bold',
        seasonCountText: 'text-orange-700 dark:text-orange-300 font-bold',
        seasonChevronColor: 'text-orange-600 dark:text-orange-400',

        semCardBorder: 'border-orange-200/90 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-600 shadow-2xs',
        semHeaderBg: 'bg-orange-50/60 dark:bg-orange-950/30 hover:bg-orange-100/50 dark:hover:bg-orange-950/50',
        semIconBoxBg: 'bg-white dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700/80 shadow-2xs',
        semIconColor: 'text-orange-600 dark:text-orange-400',
        semTitleColor: 'text-orange-900 dark:text-orange-100 font-bold',
        semBadgeBg: 'bg-orange-100 dark:bg-orange-900/60 border border-orange-200 dark:border-orange-700',
        semBadgeText: 'text-orange-800 dark:text-orange-200 font-extrabold',
        semChevronColor: 'text-orange-600 dark:text-orange-400',
        semSubjectIconBg: 'bg-orange-100/70 dark:bg-orange-900/40',
        semSubjectIconColor: 'text-orange-700 dark:text-orange-300',

        selectorBtnBg: 'bg-orange-50/70 dark:bg-orange-950/50 hover:bg-orange-100/70',
        selectorBtnBorder: 'border-orange-300 dark:border-orange-700',
        selectorBtnText: 'text-orange-800 dark:text-orange-200'
      };

    case 'winter':
      return {
        type: 'winter',
        label: 'Mùa Đông',
        seasonIcon: CloudRain,
        seasonIconBg: 'bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 shadow-2xs',
        seasonIconColor: 'text-sky-600 dark:text-sky-400',
        seasonTitleColor: 'text-sky-950 dark:text-sky-100 font-extrabold',
        seasonBadgeBg: 'bg-sky-100 dark:bg-sky-900/60 border border-sky-300 dark:border-sky-700',
        seasonBadgeText: 'text-sky-800 dark:text-sky-200 font-bold',
        seasonCountText: 'text-sky-700 dark:text-sky-300 font-bold',
        seasonChevronColor: 'text-sky-600 dark:text-sky-400',

        semCardBorder: 'border-sky-200/90 dark:border-sky-900/60 hover:border-sky-400 dark:hover:border-sky-600 shadow-2xs',
        semHeaderBg: 'bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-100/50 dark:hover:bg-sky-950/50',
        semIconBoxBg: 'bg-white dark:bg-sky-900/50 border border-sky-200 dark:border-sky-700/80 shadow-2xs',
        semIconColor: 'text-sky-600 dark:text-sky-400',
        semTitleColor: 'text-sky-900 dark:text-sky-100 font-bold',
        semBadgeBg: 'bg-sky-100 dark:bg-sky-900/60 border border-sky-200 dark:border-sky-700',
        semBadgeText: 'text-sky-800 dark:text-sky-200 font-extrabold',
        semChevronColor: 'text-sky-600 dark:text-sky-400',
        semSubjectIconBg: 'bg-sky-100/70 dark:bg-sky-900/40',
        semSubjectIconColor: 'text-sky-700 dark:text-sky-300',

        selectorBtnBg: 'bg-sky-50/70 dark:bg-sky-950/50 hover:bg-sky-100/70',
        selectorBtnBorder: 'border-sky-300 dark:border-sky-700',
        selectorBtnText: 'text-sky-800 dark:text-sky-200'
      };

    default:
      return {
        type: 'other',
        label: 'Khác',
        seasonIcon: Calendar,
        seasonIconBg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        seasonIconColor: 'text-slate-600 dark:text-slate-400',
        seasonTitleColor: 'text-slate-900 dark:text-slate-100 font-bold',
        seasonBadgeBg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        seasonBadgeText: 'text-slate-700 dark:text-slate-300 font-bold',
        seasonCountText: 'text-slate-600 dark:text-slate-400 font-bold',
        seasonChevronColor: 'text-slate-500 dark:text-slate-400',

        semCardBorder: 'border-slate-200 dark:border-slate-700 hover:border-slate-400',
        semHeaderBg: 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/60',
        semIconBoxBg: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs',
        semIconColor: 'text-slate-600 dark:text-slate-400',
        semTitleColor: 'text-slate-800 dark:text-slate-200 font-bold',
        semBadgeBg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        semBadgeText: 'text-slate-700 dark:text-slate-300 font-bold',
        semChevronColor: 'text-slate-500 dark:text-slate-400',
        semSubjectIconBg: 'bg-slate-100 dark:bg-slate-800',
        semSubjectIconColor: 'text-slate-600 dark:text-slate-300',

        selectorBtnBg: 'bg-brand-50/50 dark:bg-brand-950/40',
        selectorBtnBorder: 'border-brand-400/80 dark:border-brand-500/80',
        selectorBtnText: 'text-brand-700 dark:text-brand-300'
      };
  }
}
