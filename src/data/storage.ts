import Dexie, { Table } from 'dexie';
import { VehicleHisab, GroupByMode, GroupedHisab } from '../types';

const STORAGE_KEY = 'hisabbook_vehicle_hisab_v1';

export class HisabDatabase extends Dexie {
  hisab!: Table<VehicleHisab, number>;

  constructor() {
    super('HisabBookDatabase');
    this.version(1).stores({
      hisab: '++id, name, mobile, address, hisabType, workDetails, date, due'
    });
  }
}

export const db = new HisabDatabase();

const INITIAL_SAMPLE_DATA: VehicleHisab[] = [
  {
    id: 1,
    name: 'আব্দুর রহিম',
    mobile: '01712345678',
    address: 'গাজীপুর চৌরাস্তা',
    hisabType: 'bigha',
    workDetails: 'মাটি কাটা ও সমান করা',
    date: '2026-07-28',
    stm: '10+15',
    qty: 25,
    unit: '1.5k',
    rate: 1200,
    amount: 1500,
    billStm: '200',
    bill: 1700,
    paidStm: '1000',
    paid: 1000,
    due: 700,
    optional: ''
  },
  {
    id: 2,
    name: 'আব্দুর রহিম',
    mobile: '01712345678',
    address: 'গাজীপুর চৌরাস্তা',
    hisabType: 'bigha',
    workDetails: 'মাটি কাটা ও সমান করা',
    date: '2026-07-27',
    stm: '20',
    qty: 20,
    unit: '1.0k',
    rate: 1200,
    amount: 1200,
    billStm: '0',
    bill: 1200,
    paidStm: '1200',
    paid: 1200,
    due: 0,
    optional: ''
  },
  {
    id: 3,
    name: 'কামাল হোসেন',
    mobile: '01898765432',
    address: 'উত্তরা সেক্টর ৭',
    hisabType: 'hour',
    workDetails: 'এক্সকাভেটর ড্রাইভিং',
    date: '2026-07-28',
    stm: 'start09:00am stop01:00pm + start02:00pm stop05:30pm',
    qty: 450,
    unit: '07H:30M',
    rate: 500,
    amount: 3750,
    billStm: '250',
    bill: 4000,
    paidStm: '3000',
    paid: 3000,
    due: 1000,
    optional: ''
  },
  {
    id: 4,
    name: 'ফারুক আহমেদ',
    mobile: '01911223344',
    address: 'সাভার হেমায়েতপুর',
    hisabType: 'trip',
    workDetails: 'বালু পরিবহন',
    date: '2026-07-26',
    stm: '1+2+2',
    qty: 5,
    unit: 'trip',
    rate: 1500,
    amount: 7500,
    billStm: '500',
    bill: 8000,
    paidStm: '8000',
    paid: 8000,
    due: 0,
    optional: ''
  }
];

let isSeeded = false;

async function ensureSeeded(): Promise<void> {
  if (isSeeded) return;

  try {
    const count = await db.hisab.count();
    if (count === 0) {
      // Check if legacy localStorage data exists
      const legacyData = localStorage.getItem(STORAGE_KEY);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await db.hisab.bulkAdd(parsed);
          } else {
            await db.hisab.bulkAdd(INITIAL_SAMPLE_DATA);
          }
        } catch {
          await db.hisab.bulkAdd(INITIAL_SAMPLE_DATA);
        }
      } else {
        await db.hisab.bulkAdd(INITIAL_SAMPLE_DATA);
      }
    }
  } catch (err) {
    console.error('Dexie seeding error:', err);
  } finally {
    isSeeded = true;
  }
}

export class HisabStorage {
  public static async getAll(): Promise<VehicleHisab[]> {
    await ensureSeeded();
    return await db.hisab.reverse().toArray();
  }

  public static async getById(id: number): Promise<VehicleHisab | null> {
    await ensureSeeded();
    const item = await db.hisab.get(id);
    return item || null;
  }

  public static async insert(item: Omit<VehicleHisab, 'id'>): Promise<number> {
    await ensureSeeded();
    const newId = await db.hisab.add(item as VehicleHisab);
    return newId;
  }

  public static async update(item: VehicleHisab): Promise<boolean> {
    await ensureSeeded();
    if (!item.id) return false;
    const count = await db.hisab.update(item.id, item);
    return count > 0;
  }

  public static async delete(id: number): Promise<boolean> {
    await ensureSeeded();
    await db.hisab.delete(id);
    return true;
  }

  public static async clearAll(): Promise<void> {
    await ensureSeeded();
    await db.hisab.clear();
  }

  /**
   * Search and Group engine matching DatabaseHelper.kt powered by IndexedDB
   */
  public static async getAllWithSearchGroupSum(
    query: string = '',
    searchColumn: string | null = null,
    groupByMode: GroupByMode = GroupByMode.BY_USER_DETAILS
  ): Promise<GroupedHisab[]> {
    await ensureSeeded();

    const trimmed = query.trim().toLowerCase();
    let items: VehicleHisab[];

    // 1. IndexedDB Query Filtering
    if (trimmed.length > 0) {
      items = await db.hisab.filter(i => {
        if (searchColumn && searchColumn in i) {
          const val = String((i as unknown as Record<string, unknown>)[searchColumn] || '').toLowerCase();
          return val.includes(trimmed);
        }
        return (
          i.name.toLowerCase().includes(trimmed) ||
          i.mobile.toLowerCase().includes(trimmed) ||
          i.address.toLowerCase().includes(trimmed) ||
          i.hisabType.toLowerCase().includes(trimmed) ||
          i.workDetails.toLowerCase().includes(trimmed) ||
          i.date.toLowerCase().includes(trimmed)
        );
      }).toArray();
    } else {
      items = await db.hisab.toArray();
    }

    if (items.length === 0) return [];

    // Sort newest date first
    items.sort((a, b) => b.id - a.id);

    // 2. Grouping
    const groupMap = new Map<string, VehicleHisab[]>();

    items.forEach(item => {
      let groupKey = '';
      if (groupByMode === GroupByMode.BY_USER_DETAILS) {
        groupKey = `${item.name.trim()}_${item.hisabType.trim()}_${item.address.trim()}_${item.mobile.trim()}_${item.workDetails.trim()}`;
      } else {
        groupKey = `${item.date.trim()}_${item.hisabType.trim()}_${item.workDetails.trim()}`;
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    });

    // 3. Aggregate group totals
    const result: GroupedHisab[] = [];

    groupMap.forEach((groupItems) => {
      const first = groupItems[0];
      const totalBill = groupItems.reduce((sum, item) => sum + (item.bill || 0), 0);
      const totalPaid = groupItems.reduce((sum, item) => sum + (item.paid || 0), 0);
      const totalDue = groupItems.reduce((sum, item) => sum + (item.due || 0), 0);
      const totalQty = groupItems.reduce((sum, item) => sum + (item.qty || 0), 0);

      result.push({
        name: groupByMode === GroupByMode.BY_USER_DETAILS ? first.name : '',
        date: groupByMode === GroupByMode.BY_DATE_WORK ? first.date : '',
        hisabType: first.hisabType,
        address: groupByMode === GroupByMode.BY_USER_DETAILS ? first.address : '',
        mobile: groupByMode === GroupByMode.BY_USER_DETAILS ? first.mobile : '',
        workDetails: first.workDetails,
        totalBill,
        totalPaid,
        totalDue,
        totalQty,
        items: groupItems
      });
    });

    result.sort((a, b) => {
      const minA = Math.min(...a.items.map(i => i.id));
      const minB = Math.min(...b.items.map(i => i.id));
      return minB - minA;
    });

    return result;
  }

  /**
   * Get total count of stored records
   */
  public static async getCount(): Promise<number> {
    await ensureSeeded();
    return await db.hisab.count();
  }

  /**
   * Export all data as JSON string
   */
  public static async exportJSON(): Promise<string> {
    await ensureSeeded();
    const items = await db.hisab.toArray();
    return JSON.stringify(items, null, 2);
  }

  /**
   * Export all data as CSV string (with UTF-8 BOM for Bengali support in Excel)
   */
  public static async exportCSV(): Promise<string> {
    await ensureSeeded();
    const items = await db.hisab.toArray();
    const headers = [
      'id', 'name', 'mobile', 'address', 'hisabType', 'workDetails',
      'date', 'stm', 'qty', 'unit', 'rate', 'amount',
      'billStm', 'bill', 'paidStm', 'paid', 'due', 'optional'
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = [headers.join(',')];

    for (const item of items) {
      const row = headers.map(h => escapeCsv((item as unknown as Record<string, unknown>)[h]));
      rows.push(row.join(','));
    }

    return '\uFEFF' + rows.join('\r\n');
  }

  /**
   * Export all data as SQL INSERT statements
   */
  public static async exportSQL(): Promise<string> {
    await ensureSeeded();
    const items = await db.hisab.toArray();

    const escapeSql = (val: unknown) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      const str = String(val).replace(/'/g, "''");
      return `'${str}'`;
    };

    const today = new Date().toISOString().replace('T', ' ').split('.')[0];
    let sql = `-- HisabBook Database SQL Backup\n`;
    sql += `-- Exported Date: ${today}\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`hisab\` (\n`;
    sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  \`name\` VARCHAR(255),\n`;
    sql += `  \`mobile\` VARCHAR(255),\n`;
    sql += `  \`address\` VARCHAR(255),\n`;
    sql += `  \`hisabType\` VARCHAR(255),\n`;
    sql += `  \`workDetails\` TEXT,\n`;
    sql += `  \`date\` VARCHAR(255),\n`;
    sql += `  \`stm\` TEXT,\n`;
    sql += `  \`qty\` DOUBLE,\n`;
    sql += `  \`unit\` VARCHAR(255),\n`;
    sql += `  \`rate\` DOUBLE,\n`;
    sql += `  \`amount\` DOUBLE,\n`;
    sql += `  \`billStm\` TEXT,\n`;
    sql += `  \`bill\` DOUBLE,\n`;
    sql += `  \`paidStm\` TEXT,\n`;
    sql += `  \`paid\` DOUBLE,\n`;
    sql += `  \`due\` DOUBLE,\n`;
    sql += `  \`optional\` TEXT\n`;
    sql += `);\n\n`;

    if (items.length > 0) {
      sql += `INSERT INTO \`hisab\` (\`name\`, \`mobile\`, \`address\`, \`hisabType\`, \`workDetails\`, \`date\`, \`stm\`, \`qty\`, \`unit\`, \`rate\`, \`amount\`, \`billStm\`, \`bill\`, \`paidStm\`, \`paid\`, \`due\`, \`optional\`) VALUES\n`;
      const valueRows = items.map(item => {
        return `(${escapeSql(item.name)}, ${escapeSql(item.mobile)}, ${escapeSql(item.address)}, ${escapeSql(item.hisabType)}, ${escapeSql(item.workDetails)}, ${escapeSql(item.date)}, ${escapeSql(item.stm)}, ${escapeSql(item.qty)}, ${escapeSql(item.unit)}, ${escapeSql(item.rate)}, ${escapeSql(item.amount)}, ${escapeSql(item.billStm)}, ${escapeSql(item.bill)}, ${escapeSql(item.paidStm)}, ${escapeSql(item.paid)}, ${escapeSql(item.due)}, ${escapeSql(item.optional)})`;
      });
      sql += valueRows.join(',\n') + ';\n';
    }

    return sql;
  }

  /**
   * Import data from SQL text file
   */
  public static async importSQL(sqlText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    await ensureSeeded();
    const cleanText = sqlText.replace(/^\uFEFF/, '').trim();

    const parseSqlValues = (text: string): Omit<VehicleHisab, 'id'>[] => {
      const items: Omit<VehicleHisab, 'id'>[] = [];

      const insertRegex = /INSERT\s+INTO\s+[`"'\w]+\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]+?);/gi;
      let match;

      while ((match = insertRegex.exec(text)) !== null) {
        const colListStr = match[1];
        const valuesStr = match[2];

        let columns: string[] = [];
        if (colListStr) {
          columns = colListStr.split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase());
        }

        let inQuotes = false;
        let quoteChar = '';
        let currentTuple: string[] = [];
        let currentVal = '';
        let depth = 0;

        for (let i = 0; i < valuesStr.length; i++) {
          const char = valuesStr[i];
          const nextChar = valuesStr[i + 1];

          if (inQuotes) {
            if (char === quoteChar) {
              if (nextChar === quoteChar || nextChar === '\\') {
                currentVal += char;
                i++;
              } else {
                inQuotes = false;
              }
            } else if (char === '\\' && nextChar) {
              currentVal += nextChar;
              i++;
            } else {
              currentVal += char;
            }
          } else {
            if (char === "'" || char === '"') {
              inQuotes = true;
              quoteChar = char;
            } else if (char === '(') {
              if (depth === 0) {
                currentTuple = [];
                currentVal = '';
              }
              depth++;
            } else if (char === ')') {
              depth--;
              if (depth === 0) {
                currentTuple.push(currentVal.trim());
                currentVal = '';
                
                if (currentTuple.length > 0) {
                  const getColValByNames = (names: string[], defaultVal = '') => {
                    if (columns.length > 0) {
                      for (const n of names) {
                        const idx = columns.indexOf(n.toLowerCase());
                        if (idx !== -1 && currentTuple[idx] !== undefined) {
                          const raw = currentTuple[idx];
                          if (raw.toUpperCase() === 'NULL') return defaultVal;
                          return raw;
                        }
                      }
                    }
                    return defaultVal;
                  };

                  let itemObj: Omit<VehicleHisab, 'id'>;
                  if (columns.length > 0) {
                    itemObj = {
                      name: getColValByNames(['name', 'নাম']),
                      mobile: getColValByNames(['mobile', 'মোবাইল', 'ফোন']),
                      address: getColValByNames(['address', 'ঠিকানা']),
                      hisabType: getColValByNames(['hisabtype', 'hisab_type', 'হিসাবের ধরন', 'ধরন']),
                      workDetails: getColValByNames(['workdetails', 'work_details', 'কাজের বিবরণ', 'বিবরণ']),
                      date: getColValByNames(['date', 'তারিখ']),
                      stm: getColValByNames(['stm', 'বিবরণী']),
                      qty: Number(getColValByNames(['qty', 'পরিমাণ'], '0')) || 0,
                      unit: getColValByNames(['unit', 'একক']),
                      rate: Number(getColValByNames(['rate', 'দর'], '0')) || 0,
                      amount: Number(getColValByNames(['amount', 'মোট'], '0')) || 0,
                      billStm: getColValByNames(['billstm', 'bill_stm', 'বিলের বিবরণ']),
                      bill: Number(getColValByNames(['bill', 'বিল'], '0')) || 0,
                      paidStm: getColValByNames(['paidstm', 'paid_stm', 'জমার বিবরণ']),
                      paid: Number(getColValByNames(['paid', 'জমা', 'পরিশোধ'], '0')) || 0,
                      due: Number(getColValByNames(['due', 'বকেয়া'], '0')) || 0,
                      optional: getColValByNames(['optional', 'অন্যান্য'])
                    };
                  } else {
                    const offset = currentTuple.length === 18 ? 1 : 0;
                    itemObj = {
                      name: currentTuple[offset] || '',
                      mobile: currentTuple[offset + 1] || '',
                      address: currentTuple[offset + 2] || '',
                      hisabType: currentTuple[offset + 3] || '',
                      workDetails: currentTuple[offset + 4] || '',
                      date: currentTuple[offset + 5] || '',
                      stm: currentTuple[offset + 6] || '',
                      qty: Number(currentTuple[offset + 7] || 0) || 0,
                      unit: currentTuple[offset + 8] || '',
                      rate: Number(currentTuple[offset + 9] || 0) || 0,
                      amount: Number(currentTuple[offset + 10] || 0) || 0,
                      billStm: currentTuple[offset + 11] || '',
                      bill: Number(currentTuple[offset + 12] || 0) || 0,
                      paidStm: currentTuple[offset + 13] || '',
                      paid: Number(currentTuple[offset + 14] || 0) || 0,
                      due: Number(currentTuple[offset + 15] || 0) || 0,
                      optional: currentTuple[offset + 16] || ''
                    };
                  }
                  items.push(itemObj);
                }
              }
            } else if (char === ',' && depth === 1) {
              currentTuple.push(currentVal.trim());
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
        }
      }

      return items;
    };

    const parsedItems = parseSqlValues(cleanText);

    if (parsedItems.length === 0) {
      throw new Error('SQL ফাইল থেকে কোনো বৈধ ডাটা সারি পাওয়া যায়নি');
    }

    if (mode === 'replace') {
      await db.hisab.clear();
    }

    await db.hisab.bulkAdd(parsedItems as VehicleHisab[]);
    return { count: parsedItems.length };
  }

  /**
   * Import data from JSON
   */
  public static async importJSON(jsonText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    await ensureSeeded();
    const cleanText = jsonText.replace(/^\uFEFF/, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new Error('ফাইলের ফরম্যাট সঠিক নয় (Invalid JSON text)');
    }

    let itemList: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      itemList = parsed as Record<string, unknown>[];
    } else if (typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.hisab)) {
        itemList = obj.hisab as Record<string, unknown>[];
      } else if (Array.isArray(obj.data)) {
        itemList = obj.data as Record<string, unknown>[];
      } else if (Array.isArray(obj.items)) {
        itemList = obj.items as Record<string, unknown>[];
      }
    }

    if (itemList.length === 0) {
      throw new Error('JSON ফাইলে কোনো ডাটা তালিকা পাওয়া যায়নি');
    }

    const cleanedItems: Omit<VehicleHisab, 'id'>[] = itemList.map((item: Record<string, unknown>) => ({
      name: String(item.name || item['নাম'] || item.Name || ''),
      mobile: String(item.mobile || item['মোবাইল'] || item['ফোন'] || item.Mobile || ''),
      address: String(item.address || item['ঠিকানা'] || item.Address || ''),
      hisabType: String(item.hisabType || item.hisab_type || item['হিসাবের ধরন'] || item['ধরন'] || item.HisabType || ''),
      workDetails: String(item.workDetails || item.work_details || item['কাজের বিবরণ'] || item['বিবরণ'] || item.WorkDetails || ''),
      date: String(item.date || item['তারিখ'] || item.Date || ''),
      stm: String(item.stm || item['বিবরণী'] || item.Stm || ''),
      qty: Number(item.qty || item['পরিমাণ'] || item.Qty || 0),
      unit: String(item.unit || item['একক'] || item.Unit || ''),
      rate: Number(item.rate || item['দর'] || item.Rate || 0),
      amount: Number(item.amount || item['মোট'] || item.Amount || 0),
      billStm: String(item.billStm || item.bill_stm || item['বিলের বিবরণ'] || item.BillStm || ''),
      bill: Number(item.bill || item['বিল'] || item.Bill || 0),
      paidStm: String(item.paidStm || item.paid_stm || item['জমার বিবরণ'] || item.PaidStm || ''),
      paid: Number(item.paid || item['জমা'] || item['পরিশোধ'] || item.Paid || 0),
      due: Number(item.due || item['বকেয়া'] || item.Due || 0),
      optional: String(item.optional || item['অন্যান্য'] || item.Optional || '')
    }));

    if (cleanedItems.length === 0) {
      throw new Error('আমদানি করার মত কোনো ডাটা পাওয়া যায়নি');
    }

    if (mode === 'replace') {
      await db.hisab.clear();
    }

    await db.hisab.bulkAdd(cleanedItems as VehicleHisab[]);
    return { count: cleanedItems.length };
  }

  /**
   * Import data from CSV
   */
  public static async importCSV(csvText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    await ensureSeeded();

    const cleanText = csvText.replace(/^\uFEFF/, '');

    const parseCsvRows = (text: string): string[][] => {
      const result: string[][] = [];
      let row: string[] = [];
      let curr = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            curr += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(curr);
          curr = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(curr);
          if (row.some(field => field.trim().length > 0)) {
            result.push(row);
          }
          row = [];
          curr = '';
        } else {
          curr += char;
        }
      }
      if (curr.length > 0 || row.length > 0) {
        row.push(curr);
        if (row.some(field => field.trim().length > 0)) {
          result.push(row);
        }
      }
      return result;
    };

    const rows = parseCsvRows(cleanText);
    if (rows.length < 2) {
      throw new Error('CSV ফাইলটি খালি অথবা ডাটা সারি পাওয়া যায়নি');
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const getVal = (row: string[], colName: string, defaultVal = '') => {
      const idx = header.indexOf(colName.toLowerCase());
      return idx !== -1 && row[idx] !== undefined ? row[idx].trim() : defaultVal;
    };

    const cleanedItems: Omit<VehicleHisab, 'id'>[] = dataRows.map(row => {
      const bill = Number(getVal(row, 'bill', '0')) || 0;
      const paid = Number(getVal(row, 'paid', '0')) || 0;
      const dueVal = getVal(row, 'due', '');
      const due = dueVal !== '' ? Number(dueVal) : Math.max(0, bill - paid);

      return {
        name: getVal(row, 'name'),
        mobile: getVal(row, 'mobile'),
        address: getVal(row, 'address'),
        hisabType: getVal(row, 'hisabtype', getVal(row, 'hisab_type')),
        workDetails: getVal(row, 'workdetails', getVal(row, 'work_details')),
        date: getVal(row, 'date'),
        stm: getVal(row, 'stm'),
        qty: Number(getVal(row, 'qty', '0')) || 0,
        unit: getVal(row, 'unit'),
        rate: Number(getVal(row, 'rate', '0')) || 0,
        amount: Number(getVal(row, 'amount', '0')) || 0,
        billStm: getVal(row, 'billstm', getVal(row, 'bill_stm')),
        bill: bill,
        paidStm: getVal(row, 'paidstm', getVal(row, 'paid_stm')),
        paid: paid,
        due: due,
        optional: getVal(row, 'optional')
      };
    });

    if (cleanedItems.length === 0) {
      throw new Error('CSV ফাইল থেকে কোনো ডাটা এক্সট্র্যাক্ট করা যায়নি');
    }

    if (mode === 'replace') {
      await db.hisab.clear();
    }

    await db.hisab.bulkAdd(cleanedItems as VehicleHisab[]);
    return { count: cleanedItems.length };
  }
}


