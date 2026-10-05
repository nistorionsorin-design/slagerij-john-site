export interface Photo {
  src: string;
  width: number;
  height: number;
  focalX?: number;
  focalY?: number;
  alt: { nl: string; ro: string };
}

export interface Slot { open: string; close: string }
export interface Day { dayOfWeek: string; slots: Slot[] }

export interface Product {
  id: string;
  category: string;
  name: { nl: string; ro: string };
  line: { nl: string; ro: string };
  price: number | null;
  unit: 'kg' | 'pers' | 'colli' | 'stuk';
  photo?: string;
}

export interface FaqItem { q: string; a: string; keywords?: string[] }
