/** A failure that maps to an HTTP status. Routes translate it; services throw it. */
export class ServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}
