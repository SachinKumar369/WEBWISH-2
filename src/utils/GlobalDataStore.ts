export interface PMSGlobalData {
  businessDate?: string;

  taskDescription?: string;
  taskId?: string;

  guestName?: string;
  guestId?: string;

  reservationId?: string;
  reservationNumber?: string;
  confirmationNumber?: string;

  bookingId?: string;
  bookingNumber?: string;

  folioNumber?: string;
  invoiceNumber?: string;
  receiptNumber?: string;

  roomNumber?: string;
  roomType?: string;

  rateCode?: string;
  packageCode?: string;

  paymentReference?: string;
  transactionId?: string;

  cashierShift?: string;
  workstationId?: string;

  createdRecordId?: string;
  updatedRecordId?: string;

  randomData?: string;
}

export class GlobalDataStore {

  private static data: PMSGlobalData = {};

  static set<K extends keyof PMSGlobalData>(key: K, value: PMSGlobalData[K]): void {
    this.data[key] = value;
  }

  static get<K extends keyof PMSGlobalData>(key: K): PMSGlobalData[K] {
    return this.data[key];
  }

  static has(key: keyof PMSGlobalData): boolean {
    return key in this.data;
  }

  static remove(key: keyof PMSGlobalData): void {
    delete this.data[key];
  }

  static clear(): void {
    this.data = {};
  }

  static getAll(): PMSGlobalData {
    return this.data;
  }
}