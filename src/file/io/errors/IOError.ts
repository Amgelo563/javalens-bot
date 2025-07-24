import { type DoesntExistFileError } from './generic/DoesntExistFileError.js';
import { type SyntaxFileReadError } from './read/SyntaxFileReadError.js';
import { type AlreadyExistsFileWriteError } from './write/AlreadyExistsFileWriteError.js';
import { type SerializationFileWriteError } from './write/SerializationFileWriteError.js';

export type FileWriteError = AlreadyExistsFileWriteError | SerializationFileWriteError;

export type FileReadError = SyntaxFileReadError | DoesntExistFileError;

export type FileIOError = FileWriteError | FileReadError;
