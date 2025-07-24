import type { Result } from 'neverthrow';
import type { FileReadError, FileWriteError } from './errors/IOError.js';

/** An object that implements a specific format that can be stored/read to/from a file */
export interface FileIO {
  read(path: string): Promise<Result<unknown, FileReadError>>;
  write(options: {
    data: unknown;
    path: string;
    overwriteIfPresent?: boolean;
  }): Promise<Result<void, FileWriteError>>;
}
