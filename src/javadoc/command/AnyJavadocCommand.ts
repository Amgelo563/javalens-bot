import type { ParentJavadocCommand } from './ParentJavadocCommand.js';
import type { StandaloneJavadocCommand } from './StandaloneJavadocCommand.js';

export type AnyJavadocCommand = ParentJavadocCommand | StandaloneJavadocCommand;
