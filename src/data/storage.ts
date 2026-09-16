import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { VehicleHisab, GroupByMode, GroupedHisab, DatabaseTotals, HisabQueryResult, CustomerFilter, AdvancedFilterState, DateWorkFilter } from '../types';
import { Utils } from '../util/utils';

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
    spendStm: '',
    spend: 0,
    profit: 0,
    cashoutStm: '',
    cashout: 0,
    credit: 0,
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
    spendStm: '',
    spend: 0,
    profit: 0,
    cashoutStm: '',
    cashout: 0,
    credit: 0,
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
    spendStm: '',
    spend: 0,
    profit: 0,
    cashoutStm: '',
    cashout: 0,
    credit: 0,
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
    spendStm: '',
    spend: 0,
    profit: 0,
    cashoutStm: '',
    cashout: 0,
    credit: 0,
    optional: ''
  }
];

let cachedDbBinary: Uint8Array | null = null;
let idbInstance: IDBDatabase | null = null;
let idbOpenPromise: Promise<IDBDatabase | null> | null = null;

// Global safety suppression for closing IndexedDB connections during tab sleep/unload
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason || '');
    if (
      reason.includes('Database is closing') ||
      reason.includes('closing/hidden') ||
      reason.includes('InvalidStateError') ||
      reason.includes('database connection is closing')
    ) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '');
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('InvalidStateError') ||
      msg.includes('database connection is closing')
    ) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }
  });
}

// Safe IDB Connection Manager
async function getIDBConnection(forceNew: boolean = false): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }

  if (!forceNew && idbInstance) {
    try {
      // Test if transaction is executable on current connection without closing error
      const testTx = idbInstance.transaction(DB_STORE_NAME, 'readonly');
      try { testTx.abort(); } catch {}
      return idbInstance;
    } catch {
      idbInstance = null;
    }
  }

  if (!forceNew && idbOpenPromise) return idbOpenPromise;

  idbOpenPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open('HisabBookSqliteStorage', 1);

      request.onupgradeneeded = () => {
        try {
          if (!request.result.objectStoreNames.contains(DB_STORE_NAME)) {
            request.result.createObjectStore(DB_STORE_NAME);
          }
        } catch {
          // ignore
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        idbInstance = db;
        db.onclose = () => {
          idbInstance = null;
        };
        db.onversionchange = () => {
          try { db.close(); } catch {}
          idbInstance = null;
        };
        db.onerror = (e) => {
          if (e && typeof (e as Event).preventDefault === 'function') {
            (e as Event).preventDefault();
          }
          idbInstance = null;
        };
        idbOpenPromise = null;
        resolve(db);
      };

      request.onerror = (e) => {
        if (e && typeof (e as Event).preventDefault === 'function') {
          (e as Event).preventDefault();
        }
        idbOpenPromise = null;
        resolve(null);
      };

      request.onblocked = (e) => {
        if (e && typeof (e as Event).preventDefault === 'function') {
          (e as Event).preventDefault();
        }
        idbOpenPromise = null;
        resolve(null);
      };
    } catch {
      idbOpenPromise = null;
      resolve(null);
    }
  });

  return idbOpenPromise;
}

// Persistent SQLite IndexedDB Storage Driver with LocalStorage Fallback
async function getStoredDbBinary(): Promise<Uint8Array | null> {
  if (cachedDbBinary && cachedDbBinary.length > 0) {
    return cachedDbBinary;
  }

  // 1. Try IndexedDB with automatic retry if database is closing
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await getIDBConnection(attempt > 0);
      if (db) {
        const idbData = await new Promise<Uint8Array | null>((resolve) => {
          try {
            const tx = db.transaction(DB_STORE_NAME, 'readonly');
            const store = tx.objectStore(DB_STORE_NAME);
            const getReq = store.get(DB_FILE_KEY);
            getReq.onsuccess = () => {
              resolve(getReq.result || null);
            };
            getReq.onerror = (e) => {
              if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
              idbInstance = null;
              resolve(null);
            };
            tx.onabort = (e) => {
              if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
              idbInstance = null;
              resolve(null);
            };
            tx.onerror = (e) => {
              if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
              idbInstance = null;
              resolve(null);
            };
          } catch {
            idbInstance = null;
            resolve(null);
          }
        });

        if (idbData && idbData.length > 0) {
          cachedDbBinary = idbData;
          return idbData;
        }
      }
    } catch {
      idbInstance = null;
    }
  }

  // 2. Try LocalStorage Fallback
  try {
    const fallbackB64 = localStorage.getItem('hisab_sqlite_db_backup');
    if (fallbackB64) {
      const binStr = atob(fallbackB64);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      cachedDbBinary = bytes;
      return bytes;
    }
  } catch (e) {
    console.warn('LocalStorage fallback read error:', e);
  }

  return cachedDbBinary;
}

let saveQueue: Promise<void> = Promise.resolve();

async function saveDbBinary(data: Uint8Array): Promise<void> {
  cachedDbBinary = data;

  // Queue writes sequentially to prevent transaction conflicts and closing states
  saveQueue = saveQueue.then(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const db = await getIDBConnection(attempt > 0);
        if (db) {
          const success = await new Promise<boolean>((resolve) => {
            try {
              const tx = db.transaction(DB_STORE_NAME, 'readwrite');
              const store = tx.objectStore(DB_STORE_NAME);
              const putReq = store.put(data, DB_FILE_KEY);
              putReq.onerror = (e) => {
                if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
                idbInstance = null;
                resolve(false);
              };
              tx.oncomplete = () => resolve(true);
              tx.onerror = (e) => {
                if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
                idbInstance = null;
                resolve(false);
              };
              tx.onabort = (e) => {
                if (e && typeof (e as Event).preventDefault === 'function') (e as Event).preventDefault();
                idbInstance = null;
                resolve(false);
              };
            } catch {
              idbInstance = null;
              resolve(false);
            }
          });

          if (success) break;
        }
      } catch {
        idbInstance = null;
      }
    }

    // Also persist a fallback copy to LocalStorage (if under 4MB)
    try {
      if (data.length < 4 * 1024 * 1024) {
        let binary = '';
        const len = data.byteLength;
        const chunk = 8192;
        for (let i = 0; i < len; i += chunk) {
          binary += String.fromCharCode.apply(null, Array.from(data.subarray(i, Math.min(i + chunk, len))));
        }
        const b64 = btoa(binary);
        localStorage.setItem('hisab_sqlite_db_backup', b64);
      }
    } catch {
      // ignore quota limit
    }
  }).catch(() => {});

  return saveQueue;
}

async function getWasmBinary(): Promise<ArrayBuffer> {
  // 1. Try IndexedDB cache for instant offline startup
  try {
    const idb = await getIDBConnection();
    if (idb) {
      const cached = await new Promise<ArrayBuffer | null>((resolve) => {
        try {
          const tx = idb.transaction(DB_STORE_NAME, 'readonly');
          const store = tx.objectStore(DB_STORE_NAME);
          const req = store.get('sql_wasm_binary_cache_v1');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => {
            idbInstance = null;
            resolve(null);
          };
          tx.onerror = () => {
            idbInstance = null;
            resolve(null);
          };
        } catch {
          idbInstance = null;
          resolve(null);
        }
      });
      if (cached && cached.byteLength > 100000) {
        const u8 = new Uint8Array(cached);
        // Verify WebAssembly magic header: 0x00 0x61 0x73 0x6d (\0asm)
        if (u8[0] === 0x00 && u8[1] === 0x61 && u8[2] === 0x73 && u8[3] === 0x6d) {
          return cached;
        }
      }
    }
  } catch {
    idbInstance = null;
  }

  // 2. Candidate fetch URLs (Local, Vite asset, Public, CDN fallbacks)
  const candidateUrls: string[] = [];
  if (sqlWasmUrl) candidateUrls.push(sqlWasmUrl);
  candidateUrls.push('/sql-wasm.wasm');
  candidateUrls.push('sql-wasm.wasm');
  candidateUrls.push('./sql-wasm.wasm');
  if (typeof window !== 'undefined' && window.location) {
    candidateUrls.push(`${window.location.origin}/sql-wasm.wasm`);
  }
  // CDN fallbacks
  candidateUrls.push('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm');
  candidateUrls.push('https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm');
  candidateUrls.push('https://unpkg.com/sql.js@1.12.0/dist/sql-wasm.wasm');

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100000) {
          const u8 = new Uint8Array(buf);
          // Verify valid wasm header: 0x00 0x61 0x73 0x6d
          if (u8[0] === 0x00 && u8[1] === 0x61 && u8[2] === 0x73 && u8[3] === 0x6d) {
            // Cache asynchronously in IndexedDB for future instant offline loading
            getIDBConnection().then((idb) => {
              if (idb) {
                try {
                  const tx = idb.transaction(DB_STORE_NAME, 'readwrite');
                  tx.objectStore(DB_STORE_NAME).put(buf, 'sql_wasm_binary_cache_v1');
                } catch {}
              }
            }).catch(() => {});
            return buf;
          }
        }
      }
    } catch {}
  }

  throw new Error('Failed to load sql-wasm.wasm from local and CDN sources');
}

async function getSqliteDb(): Promise<Database> {
  if (sqliteDb) return sqliteDb;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!SQL) {
        try {
          const wasmBinary = await getWasmBinary();
          SQL = await initSqlJs({ wasmBinary });
        } catch (wasmErr) {
          console.warn('Wasm binary load fallback to locateFile:', wasmErr);
          SQL = await initSqlJs({
            locateFile: (file) => {
              if (file.endsWith('.wasm')) {
                return sqlWasmUrl || '/sql-wasm.wasm';
              }
              return file;
            }
          });
        }
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
          spendStm TEXT DEFAULT '',
          spend REAL DEFAULT 0,
          profit REAL DEFAULT 0,
          cashoutStm TEXT DEFAULT '',
          cashout REAL DEFAULT 0,
          credit REAL DEFAULT 0,
          optional TEXT DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_hisab_user ON hisab(name, hisabType, address, mobile, workDetails);
        CREATE INDEX IF NOT EXISTS idx_hisab_date ON hisab(date, hisabType, workDetails);
        CREATE INDEX IF NOT EXISTS idx_hisab_due ON hisab(due);
        CREATE INDEX IF NOT EXISTS idx_hisab_name ON hisab(name);
        CREATE INDEX IF NOT EXISTS idx_hisab_mobile ON hisab(mobile);
        CREATE INDEX IF NOT EXISTS idx_hisab_address ON hisab(address);
        CREATE INDEX IF NOT EXISTS idx_hisab_work ON hisab(workDetails);
      `);

      // Migration: ensure all new columns exist for existing databases
      try {
        const tableInfo = db.exec("PRAGMA table_info(hisab);");
        const existingCols = new Set<string>();
        if (tableInfo.length > 0 && tableInfo[0].values) {
          for (const row of tableInfo[0].values) {
            existingCols.add(String(row[1]));
          }
        }

        const columnsToAdd: { name: string; type: string; defaultVal: string }[] = [
          { name: 'spendStm', type: 'TEXT', defaultVal: "''" },
          { name: 'spend', type: 'REAL', defaultVal: '0' },
          { name: 'profit', type: 'REAL', defaultVal: '0' },
          { name: 'cashoutStm', type: 'TEXT', defaultVal: "''" },
          { name: 'cashout', type: 'REAL', defaultVal: '0' },
          { name: 'credit', type: 'REAL', defaultVal: '0' },
          { name: 'optional', type: 'TEXT', defaultVal: "''" },
        ];

        for (const col of columnsToAdd) {
          if (!existingCols.has(col.name)) {
            db.run(`ALTER TABLE hisab ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.defaultVal};`);
          }
        }
      } catch (e) {
        console.warn('Migration check warning:', e);
      }

      // Check count for seeding
      const res = db.exec('SELECT COUNT(id) AS count FROM hisab');
      const count = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
      if (count === 0) {
        const stmt = db.prepare(`
          INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, spendStm, spend, profit, cashoutStm, cashout, credit, optional)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of INITIAL_SAMPLE_DATA) {
          stmt.run([
            item.name, item.mobile, item.address, item.hisabType, item.workDetails,
            item.date, item.stm, item.qty, item.unit, item.rate, item.amount,
            item.billStm, item.bill, item.paidStm, item.paid, item.due,
            item.spendStm || '', item.spend || 0, item.profit || 0, item.cashoutStm || '', item.cashout || 0, item.credit || 0,
            item.optional
          ]);
        }
        stmt.free();
        await saveDbBinary(db.export());
      }

      sqliteDb = db;
      return db;
    } catch (err) {
      initPromise = null;
      sqliteDb = null;
      throw err;
    }
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
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, spendStm, spend, profit, cashoutStm, cashout, credit, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      item.name || '', item.mobile || '', item.address || '', item.hisabType || '', item.workDetails || '',
      item.date || '', item.stm || '', item.qty || 0, item.unit || '', item.rate || 0, item.amount || 0,
      item.billStm || '', item.bill || 0, item.paidStm || '', item.paid || 0, item.due || 0,
      item.spendStm || '', item.spend || 0, item.profit || 0, item.cashoutStm || '', item.cashout || 0, item.credit || 0,
      item.optional || ''
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
          billStm = ?, bill = ?, paidStm = ?, paid = ?, due = ?,
          spendStm = ?, spend = ?, profit = ?, cashoutStm = ?, cashout = ?, credit = ?,
          optional = ?
      WHERE id = ?
    `);
    stmt.run([
      item.name || '', item.mobile || '', item.address || '', item.hisabType || '', item.workDetails || '',
      item.date || '', item.stm || '', item.qty || 0, item.unit || '', item.rate || 0, item.amount || 0,
      item.billStm || '', item.bill || 0, item.paidStm || '', item.paid || 0, item.due || 0,
      item.spendStm || '', item.spend || 0, item.profit || 0, item.cashoutStm || '', item.cashout || 0, item.credit || 0,
      item.optional || '',
      item.id
    ]);
    stmt.free();
    await this.persist();
    return true;
  }

  /**
   * Pure SQL: Update group profile info (name, mobile, address, workDetails) for all items in the group
   */
  public static async updateGroupProfile(
    oldGroup: { name: string; date: string; hisabType: string; address: string; mobile: string; workDetails: string },
    newGroup: { name?: string; mobile?: string; address?: string; workDetails?: string; date?: string },
    groupByMode: GroupByMode
  ): Promise<boolean> {
    const db = await getSqliteDb();
    if (groupByMode === GroupByMode.BY_USER_DETAILS) {
      const stmt = db.prepare(`
        UPDATE hisab
        SET name = ?, mobile = ?, address = ?, workDetails = ?
        WHERE COALESCE(name, "") = ? AND COALESCE(hisabType, "") = ? AND COALESCE(address, "") = ? AND COALESCE(mobile, "") = ? AND COALESCE(workDetails, "") = ?
      `);
      stmt.run([
        newGroup.name || '',
        newGroup.mobile || '',
        newGroup.address || '',
        newGroup.workDetails || '',
        oldGroup.name || '',
        oldGroup.hisabType || '',
        oldGroup.address || '',
        oldGroup.mobile || '',
        oldGroup.workDetails || ''
      ]);
      stmt.free();
    } else {
      const conditions: string[] = [`COALESCE(date, "") = ?`];
      const params: (string | number)[] = [oldGroup.date || ''];
      if (oldGroup.hisabType && oldGroup.hisabType.trim()) {
        conditions.push(`COALESCE(hisabType, "") = ?`);
        params.push(oldGroup.hisabType.trim());
      }
      if (oldGroup.workDetails && oldGroup.workDetails.trim()) {
        conditions.push(`COALESCE(workDetails, "") = ?`);
        params.push(oldGroup.workDetails.trim());
      }

      const stmt = db.prepare(`
        UPDATE hisab
        SET date = ?, workDetails = ?
        WHERE ${conditions.join(' AND ')}
      `);
      stmt.run([
        newGroup.date !== undefined ? newGroup.date : (oldGroup.date || ''),
        newGroup.workDetails !== undefined ? newGroup.workDetails : (oldGroup.workDetails || ''),
        ...params
      ]);
      stmt.free();
    }
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
        COUNT(id) AS totalCount,
        MIN(date) AS minDate,
        MAX(date) AS maxDate,
        COUNT(DISTINCT date) AS dateCount
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
      totalCount: 0,
      minDate: '',
      maxDate: '',
      dateCount: 0,
      ymd: '00D'
    };

    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      const minDate = String(row.minDate || '');
      const maxDate = String(row.maxDate || '');
      const dateCount = Number(row.dateCount || 0);

      let ymd = '00D';
      if (dateCount > 0) {
        ymd = Utils.formatDaysToYMD(dateCount);
      } else if (minDate && maxDate && minDate.trim() && maxDate.trim()) {
        ymd = Utils.calculateYMDFromStartEnd(minDate, maxDate);
      }

      totals = {
        totalBill: Number(row.totalBill || 0),
        totalPaid: Number(row.totalPaid || 0),
        totalDue: Number(row.totalDue || 0),
        totalQty: Number(row.totalQty || 0),
        totalCount: Number(row.totalCount || 0),
        minDate,
        maxDate,
        dateCount,
        ymd
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
    groupByMode: GroupByMode = GroupByMode.BY_USER_DETAILS,
    workDetailsFilter: string = '',
    customerFilter: CustomerFilter | null = null,
    advancedFilter?: AdvancedFilterState | null,
    dateFilter: DateWorkFilter | string | null = null
  ): Promise<HisabQueryResult> {
    const db = await getSqliteDb();
    const trimmed = query.trim();
    const trimmedWork = workDetailsFilter.trim();
    const isUserDetails = groupByMode === GroupByMode.BY_USER_DETAILS;
    const selectedMainWork = (
      (advancedFilter?.mainWork && advancedFilter.mainWork.trim() && advancedFilter.mainWork !== 'ALL')
        ? advancedFilter.mainWork.trim()
        : (trimmedWork ? Utils.parseWorkDetails(trimmedWork).work.trim() : '')
    );
    const hasWorkFilter = Boolean(selectedMainWork);

    // 1. Where clause for search & workDetails filter & customer filter & advancedFilter & dateFilter
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (customerFilter) {
      conditions.push(`COALESCE(name, '') = ?`);
      params.push(customerFilter.name || '');
      conditions.push(`COALESCE(mobile, '') = ?`);
      params.push(customerFilter.mobile || '');
      conditions.push(`COALESCE(address, '') = ?`);
      params.push(customerFilter.address || '');
      if (hasWorkFilter && customerFilter.hisabType) {
        conditions.push(`COALESCE(hisabType, '') = ?`);
        params.push(customerFilter.hisabType || '');
      }
    }

    if (dateFilter) {
      if (typeof dateFilter === 'string') {
        if (dateFilter.trim()) {
          conditions.push(`COALESCE(date, '') = ?`);
          params.push(dateFilter.trim());
        }
      } else if (dateFilter.date && dateFilter.date.trim()) {
        conditions.push(`COALESCE(date, '') = ?`);
        params.push(dateFilter.date.trim());

        if (dateFilter.hisabType !== undefined && dateFilter.hisabType.trim()) {
          conditions.push(`COALESCE(hisabType, '') = ?`);
          params.push(dateFilter.hisabType.trim());
        }

        if (dateFilter.workDetails !== undefined && dateFilter.workDetails.trim()) {
          if (dateFilter.workDetails.includes('|')) {
            conditions.push(`COALESCE(workDetails, '') = ?`);
            params.push(dateFilter.workDetails.trim());
          } else {
            conditions.push(`COALESCE(workDetails, '') LIKE ?`);
            params.push(`%${dateFilter.workDetails.trim()}%`);
          }
        }
      }
    }

    if (trimmed.length > 0) {
      if (searchColumn) {
        conditions.push(`${searchColumn} LIKE ?`);
        params.push(`%${trimmed}%`);
      } else {
        conditions.push(`(name LIKE ? OR mobile LIKE ? OR address LIKE ? OR hisabType LIKE ? OR workDetails LIKE ? OR date LIKE ?)`);
        const p = `%${trimmed}%`;
        params.push(p, p, p, p, p, p);
      }
    }

    const hasAdvancedWorkFilter = Boolean(
      advancedFilter && (
        (advancedFilter.mainWork && advancedFilter.mainWork !== 'ALL' && advancedFilter.mainWork.trim()) ||
        (advancedFilter.year && advancedFilter.year.trim()) ||
        (advancedFilter.session && advancedFilter.session.trim()) ||
        (advancedFilter.manager && advancedFilter.manager.trim()) ||
        (advancedFilter.vehicle && advancedFilter.vehicle.trim()) ||
        (advancedFilter.driver && advancedFilter.driver.trim()) ||
        (advancedFilter.trolleyBed && advancedFilter.trolleyBed.trim())
      )
    );

    if (hasAdvancedWorkFilter && advancedFilter) {
      if (advancedFilter.mainWork && advancedFilter.mainWork !== 'ALL' && advancedFilter.mainWork.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.mainWork.trim()}%`);
      }
      if (advancedFilter.year && advancedFilter.year.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.year.trim()}%`);
      }
      if (advancedFilter.session && advancedFilter.session.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.session.trim()}%`);
      }
      if (advancedFilter.manager && advancedFilter.manager.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.manager.trim()}%`);
      }
      if (advancedFilter.vehicle && advancedFilter.vehicle.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.vehicle.trim()}%`);
      }
      if (advancedFilter.driver && advancedFilter.driver.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.driver.trim()}%`);
      }
      if (advancedFilter.trolleyBed && advancedFilter.trolleyBed.trim()) {
        conditions.push(`workDetails LIKE ?`);
        params.push(`%${advancedFilter.trolleyBed.trim()}%`);
      }
    } else if (trimmedWork.length > 0) {
      const parts = trimmedWork.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        for (const part of parts) {
          conditions.push(`workDetails LIKE ?`);
          params.push(`%${part}%`);
        }
      } else {
        conditions.push(`workDetails = ?`);
        params.push(trimmedWork);
      }
    }

    // Advanced Filter conditions
    if (advancedFilter) {
      if (advancedFilter.startDate && advancedFilter.startDate.trim()) {
        conditions.push(`date >= ?`);
        params.push(advancedFilter.startDate.trim());
      }
      if (advancedFilter.endDate && advancedFilter.endDate.trim()) {
        conditions.push(`date <= ?`);
        params.push(advancedFilter.endDate.trim());
      }
      if (advancedFilter.hisabType && advancedFilter.hisabType.trim() && advancedFilter.hisabType !== 'ALL') {
        conditions.push(`hisabType = ?`);
        params.push(advancedFilter.hisabType.trim());
      }
      if (advancedFilter.customerName && advancedFilter.customerName.trim()) {
        conditions.push(`name LIKE ?`);
        params.push(`%${advancedFilter.customerName.trim()}%`);
      }
      if (advancedFilter.mobile && advancedFilter.mobile.trim()) {
        conditions.push(`mobile LIKE ?`);
        params.push(`%${advancedFilter.mobile.trim()}%`);
      }
      if (advancedFilter.address && advancedFilter.address.trim()) {
        conditions.push(`address LIKE ?`);
        params.push(`%${advancedFilter.address.trim()}%`);
      }
      if (advancedFilter.paymentStatus === 'due_only') {
        conditions.push(`due > 0`);
      } else if (advancedFilter.paymentStatus === 'paid_only') {
        conditions.push(`due <= 0`);
      } else if (advancedFilter.paymentStatus === 'has_payment') {
        conditions.push(`paid > 0`);
      }
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // 2. Pure SQL: Overall Sums Query
    const totalsSql = `
      SELECT 
        COALESCE(SUM(bill), 0) AS totalBill,
        COALESCE(SUM(paid), 0) AS totalPaid,
        COALESCE(SUM(due), 0) AS totalDue,
        COALESCE(SUM(qty), 0) AS totalQty,
        COUNT(id) AS totalCount,
        MIN(date) AS minDate,
        MAX(date) AS maxDate,
        COUNT(DISTINCT date) AS dateCount
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
      totalCount: 0,
      minDate: '',
      maxDate: '',
      dateCount: 0,
      ymd: '00D'
    };

    if (totalsStmt.step()) {
      const row = totalsStmt.getAsObject() as Record<string, unknown>;
      const minDate = String(row.minDate || '');
      const maxDate = String(row.maxDate || '');
      const dateCount = Number(row.dateCount || 0);

      let ymd = '00D';
      if (dateCount > 0) {
        ymd = Utils.formatDaysToYMD(dateCount);
      } else if (minDate && maxDate && minDate.trim() && maxDate.trim()) {
        ymd = Utils.calculateYMDFromStartEnd(minDate, maxDate);
      }

      totals = {
        totalBill: Number(row.totalBill || 0),
        totalPaid: Number(row.totalPaid || 0),
        totalDue: Number(row.totalDue || 0),
        totalQty: Number(row.totalQty || 0),
        totalCount: Number(row.totalCount || 0),
        minDate,
        maxDate,
        dateCount,
        ymd
      };
    }
    totalsStmt.free();

    if (totals.totalCount === 0) {
      return { groups: [], totals };
    }

    // 3. Pure SQL: GROUP BY Query with SUM Aggregates & COUNT (Dynamic Sort)
    const sortBy = advancedFilter?.sortBy || 'date';
    const sortOrder = (advancedFilter?.sortOrder || 'asc').toUpperCase();

    let groupOrderBy = '';
    if (isUserDetails) {
      if (sortBy === 'id') {
        groupOrderBy = sortOrder === 'ASC' ? 'MIN(id) ASC' : 'MAX(id) DESC';
      } else if (sortBy === 'date') {
        groupOrderBy = sortOrder === 'ASC' ? 'MIN(date) ASC, MIN(id) ASC' : 'MAX(date) DESC, MAX(id) DESC';
      } else if (sortBy === 'qty') {
        groupOrderBy = `totalQty ${sortOrder}, MIN(date) ASC`;
      } else if (sortBy === 'bill') {
        groupOrderBy = `totalBill ${sortOrder}, MIN(date) ASC`;
      } else if (sortBy === 'paid') {
        groupOrderBy = `totalPaid ${sortOrder}, MIN(date) ASC`;
      } else if (sortBy === 'due') {
        groupOrderBy = `totalDue ${sortOrder}, MIN(date) ASC`;
      } else {
        groupOrderBy = 'MIN(date) ASC, MIN(id) ASC';
      }
    } else {
      if (sortBy === 'id') {
        groupOrderBy = sortOrder === 'ASC' ? 'MIN(id) ASC' : 'MAX(id) DESC';
      } else if (sortBy === 'date') {
        groupOrderBy = `date ${sortOrder}, MIN(id) ${sortOrder}`;
      } else if (sortBy === 'qty') {
        groupOrderBy = `totalQty ${sortOrder}, date ASC`;
      } else if (sortBy === 'bill') {
        groupOrderBy = `totalBill ${sortOrder}, date ASC`;
      } else if (sortBy === 'paid') {
        groupOrderBy = `totalPaid ${sortOrder}, date ASC`;
      } else if (sortBy === 'due') {
        groupOrderBy = `totalDue ${sortOrder}, date ASC`;
      } else {
        groupOrderBy = 'date ASC, MIN(id) ASC';
      }
    }

    let groupSql = '';
    if (isUserDetails) {
      if (hasWorkFilter) {
        groupSql = `
          SELECT 
            name, hisabType, address, mobile, workDetails,
            COALESCE(SUM(bill), 0) AS totalBill,
            COALESCE(SUM(paid), 0) AS totalPaid,
            COALESCE(SUM(due), 0) AS totalDue,
            COALESCE(SUM(qty), 0) AS totalQty,
            COUNT(id) AS itemCount,
            MIN(date) AS minDate,
            MAX(date) AS maxDate,
            COUNT(DISTINCT date) AS dateCount,
            MIN(date) AS earliestDate,
            MIN(id) AS earliestId,
            MAX(id) AS maxId
          FROM hisab
          ${whereClause}
          GROUP BY name, hisabType, address, mobile, workDetails
          ORDER BY ${groupOrderBy};
        `;
      } else {
        groupSql = `
          SELECT 
            name, address, mobile,
            CASE WHEN COUNT(DISTINCT hisabType) = 1 THEN MIN(hisabType) ELSE '' END AS hisabType,
            CASE WHEN COUNT(DISTINCT workDetails) = 1 THEN MIN(workDetails) ELSE '' END AS workDetails,
            COALESCE(SUM(bill), 0) AS totalBill,
            COALESCE(SUM(paid), 0) AS totalPaid,
            COALESCE(SUM(due), 0) AS totalDue,
            COALESCE(SUM(qty), 0) AS totalQty,
            COUNT(id) AS itemCount,
            MIN(date) AS minDate,
            MAX(date) AS maxDate,
            COUNT(DISTINCT date) AS dateCount,
            MIN(date) AS earliestDate,
            MIN(id) AS earliestId,
            MAX(id) AS maxId
          FROM hisab
          ${whereClause}
          GROUP BY name, address, mobile
          ORDER BY ${groupOrderBy};
        `;
      }
    } else if (hasWorkFilter) {
      groupSql = `
        SELECT 
          date,
          CASE 
            WHEN INSTR(workDetails, '|') > 0 THEN TRIM(SUBSTR(workDetails, 1, INSTR(workDetails, '|') - 1))
            ELSE TRIM(COALESCE(workDetails, ''))
          END AS mainWork,
          CASE WHEN COUNT(DISTINCT hisabType) = 1 THEN MIN(hisabType) ELSE '' END AS hisabType,
          CASE 
            WHEN COUNT(DISTINCT workDetails) = 1 THEN MIN(workDetails)
            ELSE CASE 
              WHEN INSTR(workDetails, '|') > 0 THEN TRIM(SUBSTR(workDetails, 1, INSTR(workDetails, '|') - 1))
              ELSE TRIM(COALESCE(workDetails, ''))
            END
          END AS workDetails,
          COALESCE(SUM(bill), 0) AS totalBill,
          COALESCE(SUM(paid), 0) AS totalPaid,
          COALESCE(SUM(due), 0) AS totalDue,
          COALESCE(SUM(qty), 0) AS totalQty,
          COUNT(id) AS itemCount,
          MIN(date) AS minDate,
          MAX(date) AS maxDate,
          1 AS dateCount,
          MIN(id) AS earliestId,
          MAX(id) AS maxId
        FROM hisab
        ${whereClause}
        GROUP BY date, CASE WHEN INSTR(workDetails, '|') > 0 THEN TRIM(SUBSTR(workDetails, 1, INSTR(workDetails, '|') - 1)) ELSE TRIM(COALESCE(workDetails, '')) END
        ORDER BY ${groupOrderBy};
      `;
    } else {
      // When no work filter is selected, group purely by date
      groupSql = `
        SELECT 
          date,
          CASE WHEN COUNT(DISTINCT hisabType) = 1 THEN MIN(hisabType) ELSE '' END AS hisabType,
          CASE WHEN COUNT(DISTINCT workDetails) = 1 THEN MIN(workDetails) ELSE '' END AS workDetails,
          COALESCE(SUM(bill), 0) AS totalBill,
          COALESCE(SUM(paid), 0) AS totalPaid,
          COALESCE(SUM(due), 0) AS totalDue,
          COALESCE(SUM(qty), 0) AS totalQty,
          COUNT(id) AS itemCount,
          MIN(date) AS minDate,
          MAX(date) AS maxDate,
          1 AS dateCount,
          MIN(id) AS earliestId,
          MAX(id) AS maxId
        FROM hisab
        ${whereClause}
        GROUP BY date
        ORDER BY ${groupOrderBy};
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
      const minDate = String(row.minDate || '');
      const maxDate = String(row.maxDate || '');
      const dateCount = Number(row.dateCount || 0);

      let ymd = '00D';
      if (dateCount > 0) {
        ymd = Utils.formatDaysToYMD(dateCount);
      } else if (minDate && maxDate && minDate.trim() && maxDate.trim()) {
        ymd = Utils.calculateYMDFromStartEnd(minDate, maxDate);
      }

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
        minDate,
        maxDate,
        dateCount,
        ymd,
        items: []
      };

      const groupWork = (Utils.parseWorkDetails(groupedItem.workDetails || '').work.trim() || String(row.mainWork || '').trim());
      const key = isUserDetails
        ? (hasWorkFilter
            ? `${groupedItem.name.trim()}_${groupedItem.hisabType.trim()}_${groupedItem.address.trim()}_${groupedItem.mobile.trim()}_${groupedItem.workDetails.trim()}`
            : `${groupedItem.name.trim()}_${groupedItem.address.trim()}_${groupedItem.mobile.trim()}`)
        : (hasWorkFilter
            ? `${groupedItem.date.trim()}_${groupWork}`
            : `${groupedItem.date.trim()}`);

      groups.push(groupedItem);
      groupKeyMap.set(key, groupedItem);
    }
    groupStmt.free();

    // 4. Pure SQL: Fetch Child Records (Sorted by chosen sortBy and sortOrder)
    let childOrderBy = '';
    if (sortBy === 'id') {
      childOrderBy = `id ${sortOrder}`;
    } else if (sortBy === 'date') {
      childOrderBy = `date ${sortOrder}, id ${sortOrder}`;
    } else if (sortBy === 'qty') {
      childOrderBy = `qty ${sortOrder}, date ASC, id ASC`;
    } else if (sortBy === 'bill') {
      childOrderBy = `bill ${sortOrder}, date ASC, id ASC`;
    } else if (sortBy === 'paid') {
      childOrderBy = `paid ${sortOrder}, date ASC, id ASC`;
    } else if (sortBy === 'due') {
      childOrderBy = `due ${sortOrder}, date ASC, id ASC`;
    } else {
      childOrderBy = 'date ASC, id ASC';
    }

    const childSql = `
      SELECT * FROM hisab
      ${whereClause}
      ORDER BY ${childOrderBy};
    `;

    const childStmt = db.prepare(childSql);
    if (params.length > 0) {
      childStmt.bind(params);
    }

    while (childStmt.step()) {
      const item = childStmt.getAsObject() as unknown as VehicleHisab;
      const itemWork = Utils.parseWorkDetails(item.workDetails || '').work.trim();
      const key = isUserDetails
        ? (hasWorkFilter
            ? `${(item.name || '').trim()}_${(item.hisabType || '').trim()}_${(item.address || '').trim()}_${(item.mobile || '').trim()}_${(item.workDetails || '').trim()}`
            : `${(item.name || '').trim()}_${(item.address || '').trim()}_${(item.mobile || '').trim()}`)
        : (hasWorkFilter
            ? `${(item.date || '').trim()}_${itemWork}`
            : `${(item.date || '').trim()}`);

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
    groupByMode: GroupByMode = GroupByMode.BY_USER_DETAILS,
    workDetailsFilter: string = '',
    customerFilter: CustomerFilter | null = null
  ): Promise<GroupedHisab[]> {
    const res = await this.getQueryResult(query, searchColumn, groupByMode, workDetailsFilter, customerFilter);
    return res.groups;
  }

  /**
   * Pure SQL + JS Extraction for all distinct filter options
   */
  public static async getDistinctFilterOptions(): Promise<{
    names: string[];
    mobiles: string[];
    addresses: string[];
    hisabTypes: string[];
    mainWorks: string[];
    years: string[];
    sessions: string[];
    managers: string[];
    vehicles: string[];
    drivers: string[];
    beds: string[];
  }> {
    const db = await getSqliteDb();

    const extractColumn = (sql: string): string[] => {
      try {
        const res = db.exec(sql);
        if (res.length > 0 && res[0].values.length > 0) {
          const list: string[] = [];
          for (const row of res[0].values) {
            if (row[0]) {
              const val = String(row[0]).trim();
              if (val) list.push(val);
            }
          }
          return list;
        }
      } catch {}
      return [];
    };

    const names = extractColumn("SELECT DISTINCT TRIM(name) FROM hisab WHERE name IS NOT NULL AND TRIM(name) != '' ORDER BY name ASC");
    const mobiles = extractColumn("SELECT DISTINCT TRIM(mobile) FROM hisab WHERE mobile IS NOT NULL AND TRIM(mobile) != '' ORDER BY mobile ASC");
    const addresses = extractColumn("SELECT DISTINCT TRIM(address) FROM hisab WHERE address IS NOT NULL AND TRIM(address) != '' ORDER BY address ASC");
    const hisabTypes = extractColumn("SELECT DISTINCT TRIM(hisabType) FROM hisab WHERE hisabType IS NOT NULL AND TRIM(hisabType) != '' ORDER BY hisabType ASC");
    const workDetailsList = extractColumn("SELECT DISTINCT TRIM(workDetails) FROM hisab WHERE workDetails IS NOT NULL AND TRIM(workDetails) != '' ORDER BY workDetails ASC");

    const mainWorksSet = new Set<string>();
    const yearsSet = new Set<string>();
    const sessionsSet = new Set<string>();
    const managersSet = new Set<string>();
    const vehiclesSet = new Set<string>();
    const driversSet = new Set<string>();
    const bedsSet = new Set<string>();

    workDetailsList.forEach((raw) => {
      const parsed = Utils.parseWorkDetails(raw);
      if (parsed.work) mainWorksSet.add(parsed.work);
      if (parsed.year) yearsSet.add(parsed.year);
      if (parsed.session) sessionsSet.add(parsed.session);
      if (parsed.manager) managersSet.add(parsed.manager);
      if (parsed.vehicle) vehiclesSet.add(parsed.vehicle);
      if (parsed.driver) driversSet.add(parsed.driver);
      if (parsed.trolleyBed) bedsSet.add(parsed.trolleyBed);
    });

    return {
      names,
      mobiles,
      addresses,
      hisabTypes,
      mainWorks: Array.from(mainWorksSet).sort((a, b) => a.localeCompare(b, 'bn')),
      years: Array.from(yearsSet).sort((a, b) => a.localeCompare(b, 'bn')),
      sessions: Array.from(sessionsSet).sort((a, b) => a.localeCompare(b, 'bn')),
      managers: Array.from(managersSet).sort((a, b) => a.localeCompare(b, 'bn')),
      vehicles: Array.from(vehiclesSet).sort((a, b) => a.localeCompare(b, 'bn')),
      drivers: Array.from(driversSet).sort((a, b) => a.localeCompare(b, 'bn')),
      beds: Array.from(bedsSet).sort((a, b) => a.localeCompare(b, 'bn'))
    };
  }

  /**
   * Pure SQL + JS Expansion for pipe-separated (|) workDetails:
   * e.g., "text1|text2|text3" expands to ["text1", "text1|text2", "text1|text3", "text1|text2|text3"]
   */
  public static async getDistinctWorkDetails(): Promise<string[]> {
    const db = await getSqliteDb();
    const res = db.exec(`
      SELECT DISTINCT TRIM(workDetails) AS work 
      FROM hisab 
      WHERE workDetails IS NOT NULL AND TRIM(workDetails) != '' 
      ORDER BY work ASC
    `);
    const rawList: string[] = [];
    if (res.length > 0 && res[0].values.length > 0) {
      for (const row of res[0].values) {
        if (row[0]) {
          const val = String(row[0]).trim();
          if (val) rawList.push(val);
        }
      }
    }
    return rawList;
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
      'billStm', 'bill', 'paidStm', 'paid', 'due',
      'spendStm', 'spend', 'profit', 'cashoutStm', 'cashout', 'credit',
      'optional'
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
    sql += `  \`spendStm\` TEXT,\n`;
    sql += `  \`spend\` REAL,\n`;
    sql += `  \`profit\` REAL,\n`;
    sql += `  \`cashoutStm\` TEXT,\n`;
    sql += `  \`cashout\` REAL,\n`;
    sql += `  \`credit\` REAL,\n`;
    sql += `  \`optional\` TEXT\n`;
    sql += `);\n\n`;

    if (items.length > 0) {
      sql += `INSERT INTO \`hisab\` (\`name\`, \`mobile\`, \`address\`, \`hisabType\`, \`workDetails\`, \`date\`, \`stm\`, \`qty\`, \`unit\`, \`rate\`, \`amount\`, \`billStm\`, \`bill\`, \`paidStm\`, \`paid\`, \`due\`, \`spendStm\`, \`spend\`, \`profit\`, \`cashoutStm\`, \`cashout\`, \`credit\`, \`optional\`) VALUES\n`;
      const valueRows = items.map(item => {
        return `(${escapeSql(item.name)}, ${escapeSql(item.mobile)}, ${escapeSql(item.address)}, ${escapeSql(item.hisabType)}, ${escapeSql(item.workDetails)}, ${escapeSql(item.date)}, ${escapeSql(item.stm)}, ${escapeSql(item.qty)}, ${escapeSql(item.unit)}, ${escapeSql(item.rate)}, ${escapeSql(item.amount)}, ${escapeSql(item.billStm)}, ${escapeSql(item.bill)}, ${escapeSql(item.paidStm)}, ${escapeSql(item.paid)}, ${escapeSql(item.due)}, ${escapeSql(item.spendStm || '')}, ${escapeSql(item.spend || 0)}, ${escapeSql(item.profit || 0)}, ${escapeSql(item.cashoutStm || '')}, ${escapeSql(item.cashout || 0)}, ${escapeSql(item.credit || 0)}, ${escapeSql(item.optional)})`;
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
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, spendStm, spend, profit, cashoutStm, cashout, credit, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        String(item.spendStm || item.spend_stm || item['খরচের বিবরণ'] || item.SpendStm || ''),
        Number(item.spend || item['খরচ'] || item.Spend || 0),
        Number(item.profit || item['লাভ'] || item.Profit || 0),
        String(item.cashoutStm || item.cashout_stm || item['ক্যাশআউটের বিবরণ'] || item.CashoutStm || ''),
        Number(item.cashout || item['ক্যাশআউট'] || item.Cashout || 0),
        Number(item.credit || item['ক্রেডিট'] || item.Credit || 0),
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
      INSERT INTO hisab (name, mobile, address, hisabType, workDetails, date, stm, qty, unit, rate, amount, billStm, bill, paidStm, paid, due, spendStm, spend, profit, cashoutStm, cashout, credit, optional)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        getVal(['spendstm', 'spend_stm', 'খরচের বিবরণ']),
        Number(getVal(['spend', 'খরচ'], '0')) || 0,
        Number(getVal(['profit', 'লাভ'], '0')) || 0,
        getVal(['cashoutstm', 'cashout_stm', 'ক্যাশআউটের বিবরণ']),
        Number(getVal(['cashout', 'ক্যাশআউট'], '0')) || 0,
        Number(getVal(['credit', 'ক্রেডিট'], '0')) || 0,
        getVal(['optional', 'অন্যান্য'])
      ]);
      count++;
    }

    stmt.free();
    await this.persist();
    return { count };
  }
}
