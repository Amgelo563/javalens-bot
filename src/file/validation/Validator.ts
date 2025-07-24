import type { Result } from 'neverthrow';

/** An object that validates a data matches its format, usually a wrapper over an actual validation library */
export interface Validator<T> {
  validate(data: unknown): Result<T, string>;
}
