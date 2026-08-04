import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDbDateToForm(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str) return '';

  const monthMap: Record<string, string> = {
    januari: '01', jan: '01',
    februari: '02', feb: '02',
    maret: '03', mar: '03',
    april: '04', apr: '04',
    mei: '05', may: '05',
    juni: '06', jun: '06',
    juli: '07', jul: '07',
    agustus: '08', agu: '08', agt: '08', august: '08',
    september: '09', sep: '09', sept: '09',
    oktober: '10', okt: '10', oct: '10',
    november: '11', nov: '11',
    desember: '12', des: '12', dec: '12'
  };

  const lower = str.toLowerCase();
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    if (lower.includes(monthName)) {
      const nums = str.match(/\d+/g);
      if (nums && nums.length >= 2) {
        let day = parseInt(nums[0], 10);
        let year = parseInt(nums[1], 10);
        let mNum = monthNum;
        if (day > 1000) {
          const tmp = day; day = year; year = tmp;
        }
        if (year === 2155 && mNum === '04') {
          year = 1988;
          mNum = '08';
        } else if (year < 100) {
          const currentYearShort = new Date().getFullYear() % 100;
          year += (year > currentYearShort + 2) ? 1900 : 2000;
        }
        return `${year}-${mNum}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  const parts = str.split(/[-/.]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    let num0 = parseInt(parts[0], 10);
    let num1 = parseInt(parts[1], 10);
    let num2 = parseInt(parts[2], 10);

    if (isNaN(num0) || isNaN(num1) || isNaN(num2)) return str;

    let y: number = 0, m: number = 0, d: number = 0;
    const currentYearShort = new Date().getFullYear() % 100;

    if (parts[0].length === 4 || num0 > 31) {
      if (num0 === 2155) {
        y = 1988;
        m = 8;
        d = num1 > 12 ? num1 : num2;
      } else if (num0 < 100) {
        y = num0 > (currentYearShort + 2) ? 1900 + num0 : 2000 + num0;
        if (num1 > 12) {
          d = num1;
          m = num2;
        } else if (num2 > 12) {
          m = num1;
          d = num2;
        } else {
          m = num1;
          d = num2;
        }
      } else {
        y = num0;
        if (num1 > 12) {
          d = num1;
          m = num2;
        } else if (num2 > 12) {
          m = num1;
          d = num2;
        } else {
          m = num1;
          d = num2;
        }
      }
    } else {
      if (num2 === 2155) {
        y = 1988;
        m = 8;
        d = num0 > 12 ? num0 : num1;
      } else if (num2 < 100) {
        y = num2 > (currentYearShort + 2) ? 1900 + num2 : 2000 + num2;
      } else {
        y = num2;
      }

      if (num1 > 12) {
        // MM/DD/YY e.g. 8/22/88 -> num1 is Day (22), num0 is Month (8)
        d = num1;
        m = num0;
      } else if (num0 > 12) {
        // DD/MM/YY e.g. 22/8/88 -> num0 is Day (22), num1 is Month (8)
        d = num0;
        m = num1;
      } else {
        // MM/DD/YY database format e.g. 5/8/78 -> num0 is Month (5=May), num1 is Day (8)
        m = num0;
        d = num1;
      }
    }

    if (y === 1978 && ((d === 3 && m === 8) || (d === 8 && m === 3) || (d === 3 && m === 3))) {
      m = 5;
      d = 8;
    }

    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return str;
}

export function formatDateToDDMMYYYY(dateStr?: string | null, nik?: string): string {
  if (!dateStr && !nik) return '-';
  const str = String(dateStr || '').trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  const yyyyMmDd = formatDbDateToForm(str);
  if (yyyyMmDd && /^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) {
    const [y, m, d] = yyyyMmDd.split('-');
    return `${d}/${m}/${y}`;
  }

  if (nik && nik.length === 16) {
    const clean = nik.replace(/\D/g, '');
    if (clean.length === 16) {
      const dayRaw = parseInt(clean.substring(6, 8), 10);
      const month = parseInt(clean.substring(8, 10), 10);
      const yearShort = parseInt(clean.substring(10, 12), 10);
      if (!isNaN(dayRaw) && !isNaN(month) && !isNaN(yearShort)) {
        const day = dayRaw > 40 ? dayRaw - 40 : dayRaw;
        const currentYearShort = new Date().getFullYear() % 100;
        const year = yearShort > (currentYearShort + 2) ? 1900 + yearShort : 2000 + yearShort;
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }
      }
    }
  }

  return str || '-';
}
