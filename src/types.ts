export enum GroupByMode {
  BY_USER_DETAILS = 'BY_USER_DETAILS', // Name, Type, Address, Mobile, Details
  BY_DATE_WORK = 'BY_DATE_WORK'       // Date, Type, Details
}

export interface VehicleHisab {
  id: number;
  name: string;
  mobile: string;
  address: string;
  hisabType: string;
  workDetails: string;
  date: string;
  stm: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  billStm: string;
  bill: number;
  paidStm: string;
  paid: number;
  due: number;
  optional: string;

  // Window Function (Group Sums) calculated fields
  groupTotalBill?: number;
  groupTotalPaid?: number;
  groupTotalDue?: number;
  groupTotalQty?: number;
}

export interface GroupedHisab {
  name: string;
  date: string;
  hisabType: string;
  address: string;
  mobile: string;
  workDetails: string;
  totalBill: number;
  totalPaid: number;
  totalDue: number;
  totalQty: number;
  items: VehicleHisab[];
}

export interface DatabaseTotals {
  totalBill: number;
  totalPaid: number;
  totalDue: number;
  totalQty: number;
  totalCount: number;
}

export interface HisabQueryResult {
  groups: GroupedHisab[];
  totals: DatabaseTotals;
}

export interface HisabTypeOption {
  key: string;
  labelBn: string;
}

export interface HisabCalculationResult {
  qty: number;
  amount: number;
  bill: number;
  paid: number;
  due: number;
  unit: string;
  details: string;
  errorMessage?: string;
}

export function getGroupKey(groupedItem: GroupedHisab, mode: GroupByMode): string {
  const itemIds = groupedItem.items.map(i => i.id).sort().join('-');
  if (mode === GroupByMode.BY_USER_DETAILS) {
    return `ud_${groupedItem.name.trim()}_${groupedItem.hisabType.trim()}_${groupedItem.address.trim()}_${groupedItem.mobile.trim()}_${groupedItem.workDetails.trim()}_${itemIds}`;
  } else {
    return `dw_${groupedItem.date.trim()}_${groupedItem.hisabType.trim()}_${groupedItem.workDetails.trim()}_${itemIds}`;
  }
}
