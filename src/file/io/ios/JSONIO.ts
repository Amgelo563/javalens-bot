import { err, ok, type Result } from 'neverthrow';
import { existsSync, statSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { DoesntExistFileError } from '../errors/generic/DoesntExistFileError.js';
import { FileSystemError } from '../errors/generic/FileSystemError.js';
import type { FileReadError, FileWriteError } from '../errors/IOError.js';
import { SyntaxFileReadError } from '../errors/read/SyntaxFileReadError.js';
import { AlreadyExistsFileWriteError } from '../errors/write/AlreadyExistsFileWriteError.js';
import type { FileIO } from '../FileIO.js';

export class JSONIO implements FileIO {
  public static readonly Extension = '.json';

  public static readonly Instance = new JSONIO();

  public static buildName(file: string): string {
    return file.endsWith(JSONIO.Extension)
      ? file
      : `${file}${JSONIO.Extension}`;
  }

  public async read(path: string): Promise<Result<unknown, FileReadError>> {
    const fullPath = JSONIO.buildName(path);
    if (!existsSync(fullPath)) {
      return err(new DoesntExistFileError(fullPath));
    }

    const stat = statSync(fullPath);
    if (!stat || !stat.isFile()) {
      return err(new DoesntExistFileError(fullPath));
    }

    let read;
    try {
      read = await readFile(fullPath, 'utf8');
    } catch (e) {
      return err(
        new FileSystemError(fullPath, 'Unknown FS error while reading file'),
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(read);
    } catch (e) {
      return err(
        new SyntaxFileReadError({
          path: fullPath,
          message: (e as Error).message,
          format: 'JSON',
        }),
      );
    }

    return ok(parsed);
  }

  public async write(options: {
    data: unknown;
    path: string;
    force?: boolean;
  }): Promise<Result<void, FileWriteError>> {
    const { data, path, force = false } = options;

    const fullPath = JSONIO.buildName(path);
    if (!force && existsSync(fullPath)) {
      return err(new AlreadyExistsFileWriteError({ path: fullPath }));
    }

    try {
      await writeFile(fullPath, JSON.stringify(data));
    } catch (e) {
      return err(new FileSystemError(fullPath, 'Unknown write error:'));
    }

    return ok(undefined);
  }
}
