export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
  }
}
