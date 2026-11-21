import { HisabCalculationResult } from '../types';

export namespace Utils {
  /**
   * Pure TypeScript BODMAS Parser
   * Evaluates expressions like "10+5*2", "(100+20)/2", "50-10+5"
   */
  export function calculateFromString(input: string): number {
    try {
      if (!input || !input.trim()) return 0;

      // 0. Remove text/numbers enclosed in backticks `...` (or unclosed backtick `... to end of input)
      let sanitized = input.replace(/`[^`]*(`|$)/g, '');

      // Convert Bengali digits to English digits
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      for (let i = 0; i < 10; i++) {
        sanitized = sanitized.split(banglaDigits[i]).join(String(i));
      }

      // Convert newlines to plus operator for multiline expression summation
      sanitized = sanitized.replace(/[\r\n]+/g, '+');

      // 1. Convert {} and [] to ()
      sanitized = sanitized
        .replace(/\{/g, '(').replace(/\}/g, ')')
        .replace(/\[/g, '(').replace(/\]/g, ')');

      // 2. Keep only numbers, decimals, and math operators
      sanitized = sanitized.replace(/[^0-9+\-*/^().]/g, '');

      // Clean up multiple consecutive plus operators
      sanitized = sanitized.replace(/\+{2,}/g, '+');

      if (!sanitized) return 0;

      return evalBodmas(sanitized);
    } catch {
      return 0;
    }
  }

  export const evalMathExpression = calculateFromString;
  export const evalExpression = calculateFromString;

  function evalBodmas(expression: string): number {
    let pos = -1;
    let ch = -1;

    function nextChar() {
      pos++;
      ch = pos < expression.length ? expression.charCodeAt(pos) : -1;
    }

    function eat(charToEat: number): boolean {
      while (ch === 32) nextChar(); // space
      if (ch === charToEat) {
        nextChar();
        return true;
      }
      return false;
    }

    function parse(): number {
      nextChar();
      const x = parseAdditionSubtraction();
      if (pos < expression.length) {
        throw new Error('Unexpected character: ' + String.fromCharCode(ch));
      }
      return x;
    }

    // Addition & Subtraction (+ , -)
    function parseAdditionSubtraction(): number {
      let x = parseMultiplicationDivision();
      while (true) {
        if (eat(43)) x += parseMultiplicationDivision(); // '+'
        else if (eat(45)) x -= parseMultiplicationDivision(); // '-'
        else return x;
      }
    }

    // Division & Multiplication (/ , *)
    function parseMultiplicationDivision(): number {
      let x = parseExponent();
      while (true) {
        if (eat(42)) x *= parseExponent(); // '*'
        else if (eat(47)) x /= parseExponent(); // '/'
        else return x;
      }
    }

    // Exponents ( ^ )
    function parseExponent(): number {
      let x = parsePrimary();
      while (true) {
        if (eat(94)) x = Math.pow(x, parsePrimary()); // '^'
        else return x;
      }
    }

    // Brackets & Numbers
    function parsePrimary(): number {
      if (eat(43)) return +parsePrimary(); // Unary +
      if (eat(45)) return -parsePrimary(); // Unary -

      let x: number;
      const startPos = pos;

      if (eat(40)) { // '('
        x = parseAdditionSubtraction();
        eat(41); // ')'
      } else if ((ch >= 48 && ch <= 57) || ch === 46) { // 0-9 or '.'
        while ((ch >= 48 && ch <= 57) || ch === 46) {
          nextChar();
        }
        x = parseFloat(expression.substring(startPos, pos));
      } else {
        throw new Error('Unexpected character');
      }

      return isNaN(x) ? 0 : x;
    }

    return parse();
  }

  /**
   * Katha to Bigha conversion function
   * 20 Katha = 1 Bigha
   */
  export function formatKathaToBigha(totalKatha: number): string {
    if (totalKatha <= 0) return "0.0k";

    const bigha = Math.floor(totalKatha / 20);
    const remainingKatha = totalKatha % 20;

    const kathaStr = remainingKatha % 1 === 0
      ? remainingKatha.toString()
      : remainingKatha.toFixed(1);

    if (remainingKatha > 0) {
      return `${bigha}.${kathaStr}k`;
    } else {
      return `${bigha}.0k`;
    }
  }

  /**
   * Minutes to Hour format (00H:00M)
   */
  export function minuteToHour(totalMinutes: number): string {
    if (totalMinutes <= 0) return "00H:00M";

    const mins = Math.floor(totalMinutes);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = remainingMins < 10 ? `0${remainingMins}` : `${remainingMins}`;

    return `${hStr}H:${mStr}M`;
  }

  /**
   * Parses single time string like "10:00am", "10:00 AM", "01:00pm", "1:00 PM" into minutes from midnight
   */
  function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toLowerCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];

    if (ampm) {
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes;
  }

  function calculateSingleIntervalMinutes(startRaw: string, stopRaw: string): number {
    const startMins = parseTimeToMinutes(startRaw);
    const stopMins = parseTimeToMinutes(stopRaw);

    let diff = stopMins - startMins;
    if (diff < 0) {
      diff += 24 * 60; // Overnight shift
    }
    return diff;
  }

  function getTimeRangeRegex(): RegExp {
    return /([+-]?)\s*(?:[a-zA-Z0-9_]*\s*\(\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*(?::?\s*(?:to|till|until|stop|-)\s*:?)\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*\)|start\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*stop\s*(\d{1,2}:\d{2}\s*(?:am|pm)?))/gi;
  }

  function extractExtraMinutes(cleanInput: string, regex: RegExp): { op: string; val: number }[] {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const toEnDigits = (s: string) => {
      let out = s;
      for (let i = 0; i < 10; i++) {
        out = out.split(banglaDigits[i]).join(String(i));
      }
      return out;
    };

    const withBlockTokens = cleanInput.replace(regex, (_m, op) => (op ? ` ${op} # ` : ' # '));
    const sanitizedRemainder = toEnDigits(withBlockTokens)
      .replace(/[\r\n]+/g, ' + ')
      .replace(/[^0-9.+\-#\s]/g, '');

    const extraNumbers: { op: string; val: number }[] = [];
    const tokenScanRegex = /(^|[+-])\s*(#|\d+(?:\.\d+)?)/g;
    for (const tMatch of sanitizedRemainder.matchAll(tokenScanRegex)) {
      const op = tMatch[1] === '-' ? '-' : '+';
      const tokenVal = tMatch[2];
      if (tokenVal === '#') continue;
      const num = parseFloat(tokenVal);
      if (!isNaN(num)) {
        extraNumbers.push({ op, val: num });
      }
    }
    return extraNumbers;
  }

  /**
   * Parses multi-session time string e.g. "(10:00am to 01:00pm) + (02:00pm to 04:30pm)" or "start10:00am stop01:00pm"
   * Returns formatted details like "03H:00M+02H:30M"
   */
  export function parseStartStopDetails(input: string): string {
    if (!input) return "";
    try {
      const cleanInput = input.replace(/`[^`]*(`|$)/g, '');
      const regex = getTimeRangeRegex();
      const matches = Array.from(cleanInput.matchAll(regex));

      if (matches.length === 0) return "";

      let result = "";
      matches.forEach((match, index) => {
        const operator = match[1].trim();
        const startRaw = match[2] || match[4] || '';
        const stopRaw = match[3] || match[5] || '';

        const mins = calculateSingleIntervalMinutes(startRaw, stopRaw);
        const formatted = minuteToHour(mins);

        if (index > 0) {
          const op = operator === "-" ? "-" : "+";
          result += `${op}${formatted}`;
        } else {
          if (operator === "-") result += "-";
          result += formatted;
        }
      });

      const extraMinutes = extractExtraMinutes(cleanInput, regex);
      for (const item of extraMinutes) {
        result += ` ${item.op} ${item.val} মিনিট`;
      }

      return result;
    } catch {
      return "";
    }
  }

  /**
   * Calculates total minutes from (start to stop) or start-stop blocks and +/- minute adjustments
   */
  export function calculateMinutesFromStartStop(input: string): number {
    if (!input) return 0;
    try {
      const cleanInput = input.replace(/`[^`]*(`|$)/g, '');
      const regex = getTimeRangeRegex();
      const matches = Array.from(cleanInput.matchAll(regex));

      let totalMinutes = 0;
      for (const match of matches) {
        const operator = match[1].trim();
        const startRaw = match[2] || match[4] || '';
        const stopRaw = match[3] || match[5] || '';

        const mins = calculateSingleIntervalMinutes(startRaw, stopRaw);

        if (operator === "-") {
          totalMinutes -= mins;
        } else {
          totalMinutes += mins;
        }
      }

      const extraMinutes = extractExtraMinutes(cleanInput, regex);
      for (const item of extraMinutes) {
        totalMinutes += item.op === '-' ? -item.val : item.val;
      }

      return Math.round((totalMinutes + Number.EPSILON) * 100) / 100;
    } catch {
      return 0;
    }
  }

  export function getJoinEndDateRegex(): RegExp {
    return /([+-]?)\s*([a-zA-Z0-9_]*)\s*\(\s*(\d{4}-\d{1,2}-\d{1,2})\s*(?::?\s*(?:to|till|until|end\s*date?|enddate|end|stop\s*date?|stop|-)\s*:?)\s*(\d{4}-\d{1,2}-\d{1,2})\s*\)/gi;
  }

  export function isDateRangeAttempt(input: string): boolean {
    if (!input || !input.trim()) return false;
    const s = input.trim();
    if (/\d{4}-\d{1,2}-\d{1,2}/.test(s)) return true;
    if (/\d{1,2}:\d{2}/.test(s)) return false;
    return /\(/.test(s) && /\)/.test(s);
  }

  export function hasJoinEndDateBlocks(input: string): boolean {
    return isDateRangeAttempt(input);
  }

  export interface DateRangeProcessResult {
    isValid: boolean;
    totalDays: number;
    unitText: string;
    detailsText: string;
    errorMessage?: string;
  }

  export function processDateRangeExpression(input: string, isInclusive: boolean = false): DateRangeProcessResult {
    if (!input || !input.trim()) {
      return { isValid: true, totalDays: 0, unitText: "00D", detailsText: "" };
    }

    // Strip backtick comments like `note 123`
    const cleanInput = input.replace(/`[^`]*(`|$)/g, '');

    // 1. Check for invalid operators (* / % ^)
    if (/[*/%^]/.test(cleanInput)) {
      return {
        isValid: false,
        totalDays: 0,
        unitText: "00D",
        detailsText: "",
        errorMessage: "ভুল ইনপুট! গুণ (*) বা ভাগ (/) গ্রহণযোগ্য নয়, শুধুমাত্র + এবং - ব্যবহার করুন।"
      };
    }

    const regex = getJoinEndDateRegex();
    const matches = Array.from(cleanInput.matchAll(regex));

    // Convert Bengali digits in leftover (non-date-block) expression parts and strip arbitrary text
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const toEnDigits = (s: string) => {
      let out = s;
      for (let i = 0; i < 10; i++) {
        out = out.split(banglaDigits[i]).join(String(i));
      }
      return out;
    };

    const withBlockTokens = cleanInput.replace(regex, (_m, op) => (op ? ` ${op} # ` : ' # '));
    const sanitizedRemainder = toEnDigits(withBlockTokens)
      .replace(/[\r\n]+/g, ' + ')
      .replace(/[^0-9.+\-#\s]/g, '');

    if (matches.length === 0) {
      return {
        isValid: false,
        totalDays: 0,
        unitText: "00D",
        detailsText: "",
        errorMessage: "ভুল ব্র্যাকেট/তারিখ ফরম্যাট! তারিখ ব্র্যাকেটের ভেতরে দিন, যেমন: Stat(2025-02-23 to 2027-02-23)"
      };
    }

    let totalDays = 0;
    let detailsText = "";
    let hasDateError = false;
    let singleBlockYmd = "";

    const getInclusiveEndDateStr = (endDateUtc: Date): string => {
      const next = new Date(endDateUtc.getTime() + 24 * 60 * 60 * 1000);
      const y = next.getUTCFullYear();
      const m = String(next.getUTCMonth() + 1).padStart(2, '0');
      const d = String(next.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    matches.forEach((match, index) => {
      const operator = match[1].trim();
      const prefix = match[2].trim();
      const joinStr = match[3];
      const endStr = match[4];

      const d1Parts = joinStr.split('-').map(Number);
      const d2Parts = endStr.split('-').map(Number);

      if (d1Parts.length !== 3 || d2Parts.length !== 3) {
        hasDateError = true;
        return;
      }

      const d1 = new Date(Date.UTC(d1Parts[0], d1Parts[1] - 1, d1Parts[2]));
      const d2 = new Date(Date.UTC(d2Parts[0], d2Parts[1] - 1, d2Parts[2]));

      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        hasDateError = true;
        return;
      }

      const diffMs = d2.getTime() - d1.getTime();
      const rawDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (rawDays < 0) {
        hasDateError = true;
        return;
      }

      const days = isInclusive ? rawDays + 1 : (rawDays === 0 ? 1 : rawDays);

      if (operator === '-') {
        totalDays -= days;
      } else {
        totalDays += days;
      }

      const ymdEndStr = isInclusive ? getInclusiveEndDateStr(d2) : endStr;
      const ymd = calculateYMDFromStartEnd(joinStr, ymdEndStr);
      if (index === 0) singleBlockYmd = ymd;
      const op = operator === "-" ? " - " : (index > 0 ? " + " : (operator === "+" ? "+" : ""));
      const labelPrefix = prefix ? `${prefix}: ` : "";
      detailsText += `${op}${labelPrefix}${joinStr} to ${endStr} = ${ymd} (${days} দিন)`;
    });

    if (hasDateError) {
      return {
        isValid: false,
        totalDays: 0,
        unitText: "00D",
        detailsText: "",
        errorMessage: "অকার্যকর তারিখ! সঠিক তারিখ দিন (শুরুর তারিখ শেষ তারিখের পূর্বে হতে হবে)।"
      };
    }

    // 3. Parse +/- numbers outside date-range brackets (ignoring arbitrary text)
    const extraNumbers: { op: string; val: number }[] = [];
    const tokenScanRegex = /(^|[+-])\s*(#|\d+(?:\.\d+)?)/g;
    for (const tMatch of sanitizedRemainder.matchAll(tokenScanRegex)) {
      const op = tMatch[1] === '-' ? '-' : '+';
      const tokenVal = tMatch[2];
      if (tokenVal === '#') continue;
      const num = parseFloat(tokenVal);
      if (!isNaN(num)) {
        extraNumbers.push({ op, val: num });
        totalDays += op === '-' ? -num : num;
        detailsText += ` ${op} ${num} দিন`;
      }
    }

    totalDays = Math.round((totalDays + Number.EPSILON) * 100) / 100;

    let unitText = "";
    if (matches.length === 1 && matches[0][1].trim() !== '-' && extraNumbers.length === 0) {
      unitText = singleBlockYmd || calculateYMDFromStartEnd(matches[0][3], matches[0][4]);
    } else {
      unitText = formatDaysToYMD(totalDays);
    }

    return {
      isValid: true,
      totalDays,
      unitText,
      detailsText
    };
  }

  export function calculateDaysFromJoinEndDates(input: string): number {
    const res = processDateRangeExpression(input);
    return res.totalDays;
  }

  export function formatCompactYMDParts(y: number, m: number, d: number): string {
    const parts: string[] = [];
    if (y > 0) parts.push(`${String(y).padStart(2, '0')}Y`);
    if (m > 0) parts.push(`${String(m).padStart(2, '0')}M`);
    if (d > 0) parts.push(`${String(d).padStart(2, '0')}D`);
    if (parts.length === 0) return "00D";
    return parts.join('-');
  }

  export function calculateYMDFromStartEnd(joinStr: string, endStr: string): string {
    const d1Parts = joinStr.split('-').map(Number);
    const d2Parts = endStr.split('-').map(Number);

    if (d1Parts.length !== 3 || d2Parts.length !== 3) return "00D";

    let y = d2Parts[0] - d1Parts[0];
    let m = d2Parts[1] - d1Parts[1];
    let d = d2Parts[2] - d1Parts[2];

    if (d < 0) {
      m -= 1;
      const prevMonthLastDay = new Date(Date.UTC(d2Parts[0], d2Parts[1] - 1, 0)).getUTCDate();
      d += prevMonthLastDay;
    }
    if (m < 0) {
      y -= 1;
      m += 12;
    }

    y = Math.max(0, y);
    m = Math.max(0, m);
    d = Math.max(0, d);

    if (y === 0 && m === 0 && d === 0) {
      return "01D";
    }

    return formatCompactYMDParts(y, m, d);
  }

  export function formatDaysToYMD(totalDays: number): string {
    if (totalDays <= 0) return "00D";

    const years = Math.floor(totalDays / 365);
    const remDays = totalDays % 365;
    const months = Math.floor(remDays / 30);
    const days = remDays % 30;

    return formatCompactYMDParts(years, months, days);
  }

  export function parseJoinEndDateDetails(input: string): string {
    const res = processDateRangeExpression(input);
    return res.detailsText;
  }

  /**
   * Main Recalculation Engine
   */
  export function recalculateHisab(
    stm: string,
    rateInput: string,
    billStm: string,
    paidStm: string,
    hisabType: string
  ): HisabCalculationResult {
    const isBigha = hisabType === "bigha";
    const isHour = hisabType === "hour";
    const isMonth = hisabType === "monthly" || hisabType === "month";
    const isDriverHisab = hisabType === "driver hisab";
    const attemptingDateRange = !isHour && isDateRangeAttempt(stm);

    if (attemptingDateRange) {
      const dateRes = processDateRangeExpression(stm, isDriverHisab);
      if (!dateRes.isValid) {
        const paid = calculateFromString(paidStm);
        return {
          qty: 0,
          amount: 0,
          bill: 0,
          paid,
          due: -paid,
          unit: "00D",
          details: "",
          errorMessage: dateRes.errorMessage
        };
      }

      const qty = dateRes.totalDays;
      const rate = parseFloat(String(rateInput).replace(/,/g, '')) || 0;
      const rawAmount = hisabType === 'driver hisab' ? rate * qty : (rate / 30.0) * qty;
      const amount = Math.round((rawAmount + Number.EPSILON) * 100) / 100;
      const extraBill = calculateFromString(billStm);
      const totalBill = Math.round((amount + extraBill + Number.EPSILON) * 100) / 100;
      const paid = Math.round((calculateFromString(paidStm) + Number.EPSILON) * 100) / 100;
      const due = Math.round((totalBill - paid + Number.EPSILON) * 100) / 100;

      return {
        qty,
        amount,
        bill: totalBill,
        paid,
        due,
        unit: dateRes.unitText,
        details: dateRes.detailsText
      };
    }

    // 1. Calculate Qty
    let qty = 0;
    if (isHour) {
      qty = calculateMinutesFromStartStop(stm);
    } else {
      qty = calculateFromString(stm);
    }

    // 2. Parse Rate
    const rate = parseFloat(String(rateInput).replace(/,/g, '')) || 0;

    // 3. Amount calculation
    let rawAmount = 0;
    if (isBigha) {
      rawAmount = (rate / 20.0) * qty; // 20 Katha = 1 Bigha
    } else if (isHour) {
      rawAmount = (rate / 60.0) * qty; // 60 Minutes = 1 Hour
    } else {
      rawAmount = qty * rate;
    }
    const amount = Math.round((rawAmount + Number.EPSILON) * 100) / 100;

    // 4. Additional bill & Total bill
    const extraBill = calculateFromString(billStm);
    const totalBill = Math.round((amount + extraBill + Number.EPSILON) * 100) / 100;

    // 5. Paid amount
    const paid = Math.round((calculateFromString(paidStm) + Number.EPSILON) * 100) / 100;

    // 6. Due
    const due = Math.round((totalBill - paid + Number.EPSILON) * 100) / 100;

    // 7. Unit text
    let unitText = hisabType;
    if (isBigha) {
      unitText = formatKathaToBigha(qty);
    } else if (isHour) {
      unitText = minuteToHour(qty);
    } else if (isMonth) {
      unitText = `${qty} মাস`;
    } else if (isDriverHisab) {
      unitText = formatDaysToYMD(qty);
    }

    // 8. Session breakdown
    let detailsText = "";
    if (isHour) {
      detailsText = parseStartStopDetails(stm);
    }

    return {
      qty,
      amount,
      bill: totalBill,
      paid,
      due,
      unit: unitText,
      details: detailsText
    };
  }

  export function toCleanString(num: number | string): string {
    if (num === undefined || num === null) return "0";
    const val = typeof num === 'number' ? num : parseFloat(String(num));
    if (isNaN(val) || !isFinite(val)) return "0";

    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const rounded = Math.round((absVal + Number.EPSILON) * 100) / 100;

    let formatted = "";
    try {
      formatted = rounded.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: rounded % 1 === 0 ? 0 : 2
      });
    } catch {
      const parts = (rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2)).split('.');
      let intPart = parts[0];
      const decPart = parts[1];
      const lastThree = intPart.substring(intPart.length - 3);
      const otherNumbers = intPart.substring(0, intPart.length - 3);
      if (otherNumbers !== '') {
        intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
      }
      formatted = decPart !== undefined ? `${intPart}.${decPart}` : intPart;
    }

    return isNegative ? `-${formatted}` : formatted;
  }

  export function isValidDate(dateStr: string): boolean {
    if (!dateStr || !dateStr.trim()) return false;
    const s = dateStr.trim();

    // Strictly match YYYY-MM-DD (or YYYY-M-D with hyphens)
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
        const dateObj = new Date(y, m - 1, d);
        return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
      }
    }

    return false;
  }

  export function getHisabTypeLabel(typeKey: string): string {
    const k = (typeKey || '').toLowerCase();
    if (k.includes('bigha')) return 'জমির হিসাব (বিঘা)';
    if (k.includes('trip')) return 'ট্রিপ হিসাব';
    if (k.includes('hour')) return 'ঘণ্টা হিসাব';
    if (k.includes('monthly') || k.includes('month')) return 'মাসিক হিসাব';
    if (k.includes('contract')) return 'চুক্তি হিসাব';
    if (k.includes('fuel')) return 'ফুয়েল / জ্বালানি';
    if (k.includes('rent')) return 'ভাড়া';
    if (k.includes('driver')) return 'ড্রাইভার/হেল্পার/ম্যানেজার/হিসাব';
    if (k.includes('other')) return 'অন্যান্য';
    return typeKey || 'সাধারণ';
  }

  export interface ParsedWorkDetails {
    work: string;
    year: string;
    session: string;
    manager: string;
    vehicle: string;
    driver: string;
    trolleyBed: string;
  }

  export function parseWorkDetails(raw: string): ParsedWorkDetails {
    if (!raw) {
      return { work: '', year: '', session: '', manager: '', vehicle: '', driver: '', trolleyBed: '' };
    }
    const parts = raw.split('|').map(p => p.trim());

    const isYearStr = (s: string) => /[\d0-9০-৯]{4}/.test(s) || /^(19|20)\d{2}/.test(s);
    const isSessionStr = (s: string) => /সেশন|session|সিজন|season/i.test(s);

    // Take only the first part of the work string if it contains extra delimiters
    const workFull = parts[0] || '';
    const work = workFull.split(/[-,:]/)[0].trim();
    let year = parts[1] || '';
    let session = parts[2] || '';
    let manager = parts[3] || '';
    let vehicle = parts[4] || '';
    let driver = parts[5] || '';
    let trolleyBed = parts[6] || '';

    // If unpiped legacy string (e.g. "মাটি কাটা | আব্দুর রহিম | টাটা ট্রাক" where pos 1 is not year or session)
    if (parts.length > 1 && parts.length < 7) {
      const p1 = parts[1] || '';
      if (p1 && !isYearStr(p1) && !isSessionStr(p1)) {
        year = '';
        session = '';
        manager = parts[1] || '';
        vehicle = parts[2] || '';
        driver = parts[3] || '';
        trolleyBed = parts[4] || '';
      }
    }

    return { work, year, session, manager, vehicle, driver, trolleyBed };
  }

  export function formatWorkDetails(
    work: string,
    year: string,
    session: string,
    manager: string,
    vehicle: string,
    driver: string,
    bed: string
  ): string {
    const parts = [
      (work || '').trim(),
      (year || '').trim(),
      (session || '').trim(),
      (manager || '').trim(),
      (vehicle || '').trim(),
      (driver || '').trim(),
      (bed || '').trim()
    ];
    while (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }
    return parts.join(' | ');
  }
}

