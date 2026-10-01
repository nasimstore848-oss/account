export class InsufficientCashError extends Error {
  code = 'NEGATIVE_CASH';
  constructor(public atDate: string, public shortfall: string) {
    super(`لا يمكن إتمام العملية: سيصبح رصيد الصندوق بالسالب (${shortfall}) بتاريخ ${atDate}`);
    this.name = 'InsufficientCashError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'غير مصرح لك بالقيام بهذه العملية') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
