import parse from '@pushcorn/hocon-parser';
import { statSync } from 'fs';
import { err, ok, type Result } from 'neverthrow';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { DoesntExistFileError } from '../errors/generic/DoesntExistFileError.js';
import { FileSystemError } from '../errors/generic/FileSystemError.js';
import type { FileReadError, FileWriteError } from '../errors/IOError.js';
import { SyntaxFileReadError } from '../errors/read/SyntaxFileReadError.js';
import { SerializationFileWriteError } from '../errors/write/SerializationFileWriteError.js';
import type { FileIO } from '../FileIO.js';

export class HoconIO implements FileIO {
  public static readonly Extension = '.conf';

  public static readonly Instance = new HoconIO();

  public static buildName(file: string): string {
    return file.endsWith(HoconIO.Extension)
      ? file
      : `${file}${HoconIO.Extension}`;
  }

  public async read(path: string): Promise<Result<unknown, FileReadError>> {
    const fullPath = HoconIO.buildName(path);
    if (!existsSync(fullPath)) {
      return err(new DoesntExistFileError(fullPath));
    }

    const stat = statSync(fullPath);
    if (!stat || !stat.isFile()) {
      return err(new DoesntExistFileError(fullPath));
    }

    let read;
    try {
      read = await parse({
        url: fullPath,
        strict: false,
      });
    } catch (e) {
      return err(
        new SyntaxFileReadError({
          path: fullPath,
          message: (e as Error).message,
          format: 'HOCON',
        }),
      );
    }

    return ok(read);
  }

  // technically this writes to json, not hocon, but hocon is a subset of json anyways
  public async write(options: {
    data: unknown;
    path: string;
  }): Promise<Result<void, FileWriteError>> {
    const { data, path } = options;
    let serialized: string;
    try {
      serialized = JSON.stringify(data);
    } catch (e) {
      return err(
        new SerializationFileWriteError({
          input: data,
          format: 'HOCON (JSON)',
        }),
      );
    }

    try {
      await writeFile(path, serialized);
    } catch (e) {
      return err(
        new FileSystemError(path, 'Unknown write error:', { cause: e }),
      );
    }

    return ok(undefined);
  }
}
