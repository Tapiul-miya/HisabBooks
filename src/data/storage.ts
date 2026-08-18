import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { VehicleHisab, GroupByMode, GroupedHisab, DatabaseTotals, HisabQueryResult } from '../types';

const DB_STORE_NAME = 'sqlite_db_store';
const DB_FILE_KEY = 'hisabbook.sqlite';

let SQL: SqlJsStatic | null = null;
let sqliteDb: Database | null = null;
let initPromise: Promise<Database> | null = null;

const INITIAL_SAMPLE_DATA: Omit<VehicleHisab, 'id'>[] = [
  {
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

// Persistent SQLite IndexedDB Storage Driver
async function getStoredDbBinary(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('HisabBookSqliteStorage', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DB_STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE_NAME, 'readonly');
        const store = tx.objectStore(DB_STORE_NAME);
        const getReq = store.get(DB_FILE_KEY);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveDbBinary(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('HisabBookSqliteStorage', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DB_STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(DB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(DB_STORE_NAME);
        store.put(data, DB_FILE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function getSqliteDb(): Promise<Database> {
  if (sqliteDb) return sqliteDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl
      });
    }

    const savedBinary = await getStoredDbBinary();
    let db: Database;
    if (savedBinary && savedBinary.length > 0) {
      db = new SQL.Database(savedBinary);
    } else {
      db = new SQL.Database();
    }

    // 1. Create SQLite tables and indexes
    db.run(`
      CREATE TABLE IF NOT EXISTS hisab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT '',
        mobile TEXT DEFAULT '',
        address TEXT DEFAULT '',
        hisabType TEXT DEFAULT '',
        workDetails TEXT DEFAULT '',
        date TEXT DEFAULT '',
        stm TEXT DEFAULT '',
        qty REAL DEFAULT 0,
        unit TEXT DEFAULT '',
        rate REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        billStm TEXT DEFAULT '',
        bill REAL DEFAULT 0,
        paidStm TEXT DEFAULT '',
        paid REAL DEFAULT 0,
        due REAL DEFAULT 0,
        optional TEXT DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_hisab_user ON hisab(name, hisabType, address, mobile, workDetails);
      CREATE INDEX IF NOT EXISTS idx_hisab_date ON hisab(date, hisabType, workDetails);
      CREATE INDEX IF NOT EXISTS idx_hisab_due ON hisab(due);
    `);

    // Check count for seeding
    const res = db.exec('SELECT COUNT(id) AS count FROM hisab');
    const count = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
    if (count === 0) {
      const stmt = db.prepare(`
        INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, optional)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of INITIAL_SAMPLE_DATA) {
        stmt.run([
          item.name, item.mobile, item.address, item.hisabType, item.workDetails,
          item.date, item.stm, item.qty, item.unit, item.rate, item.amount,
          item.billStm, item.bill, item.paidStm, item.paid, item.due, item.optional
        ]);
      }
      stmt.free();
      await saveDbBinary(db.export());
    }

    sqliteDb = db;
    return db;
  })();

  return initPromise;
}

export class HisabStorage {
  /**
   * Persist SQLite database state to storage
   */
  private static async persist(): Promise<void> {
    if (sqliteDb) {
      const binary = sqliteDb.export();
      await saveDbBinary(binary);
    }
  }

  /**
   * Pure SQL: SELECT * FROM hisab ORDER BY date ASC, id ASC;
   */
  public static async getAll(): Promise<VehicleHisab[]> {
    const db = await getSqliteDb();
    const result: VehicleHisab[] = [];
    const stmt = db.prepare('SELECT * FROM hisab ORDER BY date ASC, id ASC');
    while (stmt.step()) {
      result.push(stmt.getAsObject() as unknown as VehicleHisab);
    }
    stmt.free();
    return result;
  }

  /**
   * Pure SQL: SELECT * FROM hisab WHERE id = ?;
   */
  public static async getById(id: number): Promise<VehicleHisab | null> {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT * FROM hisab WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const obj = stmt.getAsObject() as unknown as VehicleHisab;
      stmt.free();
      return obj;
    }
    stmt.free();
    return null;
  }

  /**
   * Pure SQL: INSERT INTO hisab (...) VALUES (...)
   */
  public static async insert(item: Omit<VehicleHisab, 'id'>): Promise<number> {
    const db = await getSqliteDb();
    const stmt = db.prepare(`
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      item.name || '', item.mobile || '', item.address || '', item.hisabType || '', item.workDetails || '',
      item.date || '', item.stm || '', item.qty || 0, item.unit || '', item.rate || 0, item.amount || 0,
      item.billStm || '', item.bill || 0, item.paidStm || '', item.paid || 0, item.due || 0, item.optional || ''
    ]);
    stmt.free();

    const res = db.exec('SELECT last_insert_rowid() AS id');
    const newId = Number(res[0].values[0][0]);
    await this.persist();
    return newId;
  }

  /**
   * Pure SQL: UPDATE hisab SET ... WHERE id = ?
   */
  public static async update(item: VehicleHisab): Promise<boolean> {
    if (!item.id) return false;
    const db = await getSqliteDb();
    const stmt = db.prepare(`
      UPDATE hisab
      SET name = ?, mobile = ?, address = ?, hisabType = ?, workDetails = ?,
          date = ?, stm = ?, qty = ?, unit = ?, rate = ?, amount = ?,
          billStm = ?, bill = ?, paidStm = ?, paid = ?, due = ?, optional = ?
      WHERE id = ?
    `);
    stmt.run([
      item.name || '', item.mobile || '', item.address || '', item.hisabType || '', item.workDetails || '',
      item.date || '', item.stm || '', item.qty || 0, item.unit || '', item.rate || 0, item.amount || 0,
      item.billStm || '', item.bill || 0, item.paidStm || '', item.paid || 0, item.due || 0, item.optional || '',
      item.id
    ]);
    stmt.free();
    await this.persist();
    return true;
  }

  /**
   * Pure SQL: DELETE FROM hisab WHERE id = ?
   */
  public static async delete(id: number): Promise<boolean> {
    const db = await getSqliteDb();
    const stmt = db.prepare('DELETE FROM hisab WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    await this.persist();
    return true;
  }

  /**
   * Pure SQL: DELETE FROM hisab;
   */
  public static async clearAll(): Promise<void> {
    const db = await getSqliteDb();
    db.run('DELETE FROM hisab');
    await this.persist();
  }

  /**
   * Pure SQL Aggregate Query:
   * SELECT SUM(bill) AS totalBill, SUM(paid) AS totalPaid, SUM(due) AS totalDue, SUM(qty) AS totalQty, COUNT(id) AS totalCount FROM hisab WHERE ...
   */
  public static async getDatabaseTotals(
    query: string = '',
    searchColumn: string | null = null
  ): Promise<DatabaseTotals> {
    const db = await getSqliteDb();
    const trimmed = query.trim();

    let sql = `
      SELECT 
        COALESCE(SUM(bill), 0) AS totalBill,
        COALESCE(SUM(paid), 0) AS totalPaid,
        COALESCE(SUM(due), 0) AS totalDue,
        COALESCE(SUM(qty), 0) AS totalQty,
        COUNT(id) AS totalCount
      FROM hisab
    `;

    const params: (string | number)[] = [];
    if (trimmed.length > 0) {
      if (searchColumn) {
        sql += ` WHERE ${searchColumn} LIKE ?`;
        params.push(`%${trimmed}%`);
      } else {
        sql += ` WHERE (name LIKE ? OR mobile LIKE ? OR address LIKE ? OR hisabType LIKE ? OR workDetails LIKE ? OR date LIKE ?)`;
        const p = `%${trimmed}%`;
        params.push(p, p, p, p, p, p);
      }
    }

    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    let totals: DatabaseTotals = {
      totalBill: 0,
      totalPaid: 0,
      totalDue: 0,
      totalQty: 0,
      totalCount: 0
    };

    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, number>;
      totals = {
        totalBill: Number(row.totalBill || 0),
        totalPaid: Number(row.totalPaid || 0),
        totalDue: Number(row.totalDue || 0),
        totalQty: Number(row.totalQty || 0),
        totalCount: Number(row.totalCount || 0)
      };
    }
    stmt.free();
    return totals;
  }

  /**
   * Pure SQL GROUP BY Query with SUM and child sorting:
   * Uses SQLite GROUP BY engine with SUM aggregates.
   */
  public static async getQueryResult(
    query: string = '',
    searchColumn: string | null = null,
    groupByMode: GroupByMode = GroupByMode.BY_USER_DETAILS
  ): Promise<HisabQueryResult> {
    const db = await getSqliteDb();
    const trimmed = query.trim();
    const isUserDetails = groupByMode === GroupByMode.BY_USER_DETAILS;

    // 1. Where clause for search
    let whereClause = '';
    const params: (string | number)[] = [];
    if (trimmed.length > 0) {
      if (searchColumn) {
        whereClause = ` WHERE ${searchColumn} LIKE ?`;
        params.push(`%${trimmed}%`);
      } else {
        whereClause = ` WHERE (name LIKE ? OR mobile LIKE ? OR address LIKE ? OR hisabType LIKE ? OR workDetails LIKE ? OR date LIKE ?)`;
        const p = `%${trimmed}%`;
        params.push(p, p, p, p, p, p);
      }
    }

    // 2. Pure SQL: Overall Sums Query
    const totalsSql = `
      SELECT 
        COALESCE(SUM(bill), 0) AS totalBill,
        COALESCE(SUM(paid), 0) AS totalPaid,
        COALESCE(SUM(due), 0) AS totalDue,
        COALESCE(SUM(qty), 0) AS totalQty,
        COUNT(id) AS totalCount
      FROM hisab
      ${whereClause}
    `;

    const totalsStmt = db.prepare(totalsSql);
    if (params.length > 0) {
      totalsStmt.bind(params);
    }

    let totals: DatabaseTotals = {
      totalBill: 0,
      totalPaid: 0,
      totalDue: 0,
      totalQty: 0,
      totalCount: 0
    };

    if (totalsStmt.step()) {
      const row = totalsStmt.getAsObject() as Record<string, number>;
      totals = {
        totalBill: Number(row.totalBill || 0),
        totalPaid: Number(row.totalPaid || 0),
        totalDue: Number(row.totalDue || 0),
        totalQty: Number(row.totalQty || 0),
        totalCount: Number(row.totalCount || 0)
      };
    }
    totalsStmt.free();

    if (totals.totalCount === 0) {
      return { groups: [], totals };
    }

    // 3. Pure SQL: GROUP BY Query with SUM Aggregates & COUNT (Date ASC)
    let groupSql = '';
    if (isUserDetails) {
      groupSql = `
        SELECT 
          name, hisabType, address, mobile, workDetails,
          COALESCE(SUM(bill), 0) AS totalBill,
          COALESCE(SUM(paid), 0) AS totalPaid,
          COALESCE(SUM(due), 0) AS totalDue,
          COALESCE(SUM(qty), 0) AS totalQty,
          COUNT(id) AS itemCount,
          MIN(date) AS earliestDate,
          MIN(id) AS earliestId
        FROM hisab
        ${whereClause}
        GROUP BY name, hisabType, address, mobile, workDetails
        ORDER BY earliestDate ASC, earliestId ASC;
      `;
    } else {
      groupSql = `
        SELECT 
          date, hisabType, workDetails,
          COALESCE(SUM(bill), 0) AS totalBill,
          COALESCE(SUM(paid), 0) AS totalPaid,
          COALESCE(SUM(due), 0) AS totalDue,
          COALESCE(SUM(qty), 0) AS totalQty,
          COUNT(id) AS itemCount,
          MIN(id) AS earliestId
        FROM hisab
        ${whereClause}
        GROUP BY date, hisabType, workDetails
        ORDER BY date ASC, earliestId ASC;
      `;
    }

    const groupStmt = db.prepare(groupSql);
    if (params.length > 0) {
      groupStmt.bind(params);
    }

    const groups: GroupedHisab[] = [];
    const groupKeyMap = new Map<string, GroupedHisab>();

    while (groupStmt.step()) {
      const row = groupStmt.getAsObject() as Record<string, unknown>;
      const groupedItem: GroupedHisab = {
        name: isUserDetails ? String(row.name || '') : '',
        date: !isUserDetails ? String(row.date || '') : '',
        hisabType: String(row.hisabType || ''),
        address: isUserDetails ? String(row.address || '') : '',
        mobile: isUserDetails ? String(row.mobile || '') : '',
        workDetails: String(row.workDetails || ''),
        totalBill: Number(row.totalBill || 0),
        totalPaid: Number(row.totalPaid || 0),
        totalDue: Number(row.totalDue || 0),
        totalQty: Number(row.totalQty || 0),
        itemCount: Number(row.itemCount || 0),
        items: []
      };

      const key = isUserDetails
        ? `${groupedItem.name.trim()}_${groupedItem.hisabType.trim()}_${groupedItem.address.trim()}_${groupedItem.mobile.trim()}_${groupedItem.workDetails.trim()}`
        : `${groupedItem.date.trim()}_${groupedItem.hisabType.trim()}_${groupedItem.workDetails.trim()}`;

      groups.push(groupedItem);
      groupKeyMap.set(key, groupedItem);
    }
    groupStmt.free();

    // 4. Pure SQL: Fetch Child Records (Sorted Date ASC, id ASC)
    const childSql = `
      SELECT * FROM hisab
      ${whereClause}
      ORDER BY date ASC, id ASC;
    `;

    const childStmt = db.prepare(childSql);
    if (params.length > 0) {
      childStmt.bind(params);
    }

    while (childStmt.step()) {
      const item = childStmt.getAsObject() as unknown as VehicleHisab;
      const key = isUserDetails
        ? `${(item.name || '').trim()}_${(item.hisabType || '').trim()}_${(item.address || '').trim()}_${(item.mobile || '').trim()}_${(item.workDetails || '').trim()}`
        : `${(item.date || '').trim()}_${(item.hisabType || '').trim()}_${(item.workDetails || '').trim()}`;

      const grp = groupKeyMap.get(key);
      if (grp) {
        grp.items.push(item);
      }
    }
    childStmt.free();

    return { groups, totals };
  }

  /**
   * Wrapper for backward compatibility
   */
  public static async getAllWithSearchGroupSum(
    query: string = '',
    searchColumn: string | null = null,
    groupByMode: GroupByMode = GroupByMode.BY_USER_DETAILS
  ): Promise<GroupedHisab[]> {
    const res = await this.getQueryResult(query, searchColumn, groupByMode);
    return res.groups;
  }

  /**
   * Pure SQL: SELECT COUNT(id) AS count FROM hisab;
   */
  public static async getCount(): Promise<number> {
    const db = await getSqliteDb();
    const res = db.exec('SELECT COUNT(id) AS count FROM hisab');
    if (res.length > 0 && res[0].values.length > 0) {
      return Number(res[0].values[0][0]);
    }
    return 0;
  }

  /**
   * Export all data as JSON string
   */
  public static async exportJSON(): Promise<string> {
    const items = await this.getAll();
    return JSON.stringify(items, null, 2);
  }

  /**
   * Export all data as CSV string (with UTF-8 BOM for Bengali support in Excel)
   */
  public static async exportCSV(): Promise<string> {
    const items = await this.getAll();
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
   * Export all data as pure SQL INSERT statements
   */
  public static async exportSQL(): Promise<string> {
    const items = await this.getAll();

    const escapeSql = (val: unknown) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      const str = String(val).replace(/'/g, "''");
      return `'${str}'`;
    };

    const today = new Date().toISOString().replace('T', ' ').split('.')[0];
    let sql = `-- HisabBook SQLite Database Backup\n`;
    sql += `-- Exported Date: ${today}\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`hisab\` (\n`;
    sql += `  \`id\` INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    sql += `  \`name\` TEXT,\n`;
    sql += `  \`mobile\` TEXT,\n`;
    sql += `  \`address\` TEXT,\n`;
    sql += `  \`hisabType\` TEXT,\n`;
    sql += `  \`workDetails\` TEXT,\n`;
    sql += `  \`date\` TEXT,\n`;
    sql += `  \`stm\` TEXT,\n`;
    sql += `  \`qty\` REAL,\n`;
    sql += `  \`unit\` TEXT,\n`;
    sql += `  \`rate\` REAL,\n`;
    sql += `  \`amount\` REAL,\n`;
    sql += `  \`billStm\` TEXT,\n`;
    sql += `  \`bill\` REAL,\n`;
    sql += `  \`paidStm\` TEXT,\n`;
    sql += `  \`paid\` REAL,\n`;
    sql += `  \`due\` REAL,\n`;
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
   * Import data from SQL text file directly into SQLite Engine
   */
  public static async importSQL(sqlText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    const db = await getSqliteDb();
    const cleanText = sqlText.replace(/^\uFEFF/, '').trim();

    if (mode === 'replace') {
      db.run('DELETE FROM hisab');
    }

    const countBefore = await this.getCount();

    try {
      // Try direct SQLite execution first
      db.run(cleanText);
    } catch {
      // Fallback: robust multi-table regex parser
      const insertRegex = /INSERT\s+INTO\s+[`"'\w]+\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]+?);/gi;
      let match;

      while ((match = insertRegex.exec(cleanText)) !== null) {
        try {
          db.run(match[0]);
        } catch (e) {
          console.warn('Skipped problematic SQL row:', e);
        }
      }
    }

    const countAfter = await this.getCount();
    await this.persist();

    const importedCount = mode === 'replace' ? countAfter : (countAfter - countBefore);
    return { count: Math.max(importedCount, 0) };
  }

  /**
   * Import data from JSON
   */
  public static async importJSON(jsonText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    const db = await getSqliteDb();
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

    if (mode === 'replace') {
      db.run('DELETE FROM hisab');
    }

    const stmt = db.prepare(`
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (const item of itemList) {
      stmt.run([
        String(item.name || item['নাম'] || item.Name || ''),
        String(item.mobile || item['মোবাইল'] || item['ফোন'] || item.Mobile || ''),
        String(item.address || item['ঠিকানা'] || item.Address || ''),
        String(item.hisabType || item.hisab_type || item['হিসাবের ধরন'] || item['ধরন'] || item.HisabType || ''),
        String(item.workDetails || item.work_details || item['কাজের বিবরণ'] || item['বিবরণ'] || item.WorkDetails || ''),
        String(item.date || item['তারিখ'] || item.Date || ''),
        String(item.stm || item['বিবরণী'] || item.Stm || ''),
        Number(item.qty || item['পরিমাণ'] || item.Qty || 0),
        String(item.unit || item['একক'] || item.Unit || ''),
        Number(item.rate || item['দর'] || item.Rate || 0),
        Number(item.amount || item['মোট'] || item.Amount || 0),
        String(item.billStm || item.bill_stm || item['বিলের বিবরণ'] || item.BillStm || ''),
        Number(item.bill || item['বিল'] || item.Bill || 0),
        String(item.paidStm || item.paid_stm || item['জমার বিবরণ'] || item.PaidStm || ''),
        Number(item.paid || item['জমা'] || item['পরিশোধ'] || item.Paid || 0),
        Number(item.due || item['বকেয়া'] || item.Due || 0),
        String(item.optional || item['অন্যান্য'] || item.Optional || '')
      ]);
      count++;
    }
    stmt.free();
    await this.persist();
    return { count };
  }

  /**
   * Import data from CSV
   */
  public static async importCSV(csvText: string, mode: 'append' | 'replace'): Promise<{ count: number }> {
    const db = await getSqliteDb();
    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length <= 1) {
      throw new Error('CSV ফাইলে কোনো ডাটা পাওয়া যায়নি');
    }

    const parseCsvLine = (line: string): string[] => {
      const values: string[] = [];
      let inQuotes = false;
      let currentVal = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentVal += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());
      return values;
    };

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/['"`]/g, ''));

    if (mode === 'replace') {
      db.run('DELETE FROM hisab');
    }

    const stmt = db.prepare(`
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      if (values.length === 0 || values.every(v => v === '')) continue;

      const getVal = (colNames: string[], defaultVal = '') => {
        for (const name of colNames) {
          const idx = headers.indexOf(name.toLowerCase());
          if (idx !== -1 && values[idx] !== undefined) {
            return values[idx];
          }
        }
        return defaultVal;
      };

      stmt.run([
        getVal(['name', 'নাম']),
        getVal(['mobile', 'মোবাইল', 'ফোন']),
        getVal(['address', 'ঠিকানা']),
        getVal(['hisabtype', 'hisab_type', 'হিসাবের ধরন', 'ধরন']),
        getVal(['workdetails', 'work_details', 'কাজের বিবরণ', 'বিবরণ']),
        getVal(['date', 'তারিখ']),
        getVal(['stm', 'বিবরণী']),
        Number(getVal(['qty', 'পরিমাণ'], '0')) || 0,
        getVal(['unit', 'একক']),
        Number(getVal(['rate', 'দর'], '0')) || 0,
        Number(getVal(['amount', 'মোট'], '0')) || 0,
        getVal(['billstm', 'bill_stm', 'বিলের বিবরণ']),
        Number(getVal(['bill', 'বিল'], '0')) || 0,
        getVal(['paidstm', 'paid_stm', 'জমার বিবরণ']),
        Number(getVal(['paid', 'জমা', 'পরিশোধ'], '0')) || 0,
        Number(getVal(['due', 'বকেয়া'], '0')) || 0,
        getVal(['optional', 'অন্যান্য'])
      ]);
      count++;
    }

    stmt.free();
    await this.persist();
    return { count };
  }
}
