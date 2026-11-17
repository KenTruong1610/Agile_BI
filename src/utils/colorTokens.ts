import { CardSurfaceColorKey, LabelColorKey } from '../types';

export const LABEL_COLOR_CLASSES: Record<
  LabelColorKey,
  { bar: string; chip: string; labelVi: string }
> = {
  red: {
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 border-rose-200',
    labelVi: 'Đỏ · Khẩn cấp / Bug',
  },
  blue: {
    bar: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-800 border-blue-200',
    labelVi: 'Xanh dương · Tính năng',
  },
  amber: {
    bar: 'bg-amber-400',
    chip: 'bg-amber-100 text-amber-900 border-amber-200',
    labelVi: 'Vàng · Cần chú ý',
  },
  emerald: {
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    labelVi: 'Xanh lá · Hoàn tất / Ổn định',
  },
  purple: {
    bar: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 border-violet-200',
    labelVi: 'Tím · UI / UX',
  },
  cyan: {
    bar: 'bg-cyan-500',
    chip: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    labelVi: 'Xanh ngọc · API / Backend',
  },
};

export const CARD_SURFACE_CLASSES: Record<
  CardSurfaceColorKey,
  { cardBg: string; border: string; swatch: string; nameVi: string }
> = {
  default: {
    cardBg: 'bg-white',
    border: 'border-slate-200/90 hover:border-blue-300',
    swatch: 'bg-white border-slate-300',
    nameVi: 'Mặc định (Trắng)',
  },
  blue: {
    cardBg: 'bg-blue-50/75',
    border: 'border-blue-200 hover:border-blue-400',
    swatch: 'bg-blue-100 border-blue-400',
    nameVi: 'Xanh dương nhạt',
  },
  emerald: {
    cardBg: 'bg-emerald-50/75',
    border: 'border-emerald-200 hover:border-emerald-400',
    swatch: 'bg-emerald-100 border-emerald-400',
    nameVi: 'Xanh lá nhạt',
  },
  amber: {
    cardBg: 'bg-amber-50/80',
    border: 'border-amber-200 hover:border-amber-400',
    swatch: 'bg-amber-100 border-amber-400',
    nameVi: 'Vàng nhạt',
  },
  rose: {
    cardBg: 'bg-rose-50/80',
    border: 'border-rose-200 hover:border-rose-400',
    swatch: 'bg-rose-100 border-rose-400',
    nameVi: 'Đỏ hồng nhạt',
  },
  violet: {
    cardBg: 'bg-violet-50/75',
    border: 'border-violet-200 hover:border-violet-400',
    swatch: 'bg-violet-100 border-violet-400',
    nameVi: 'Tím nhạt',
  },
};
