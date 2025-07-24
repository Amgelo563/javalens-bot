import {
  type InferOutput,
  number,
  object,
  optional,
  pipe,
  string,
  transform,
  url,
} from 'valibot';

export const JavadocCommandOriginSchema = object({
  url: pipe(
    string("A origin's url must be a string"),
    url(
      ({ input }) =>
        `A origin's url must be a valid Javadocs url, input: ${input}`,
    ),
  ),
  cacheDays: optional(
    pipe(
      number("A origin's cache must be a number"),
      transform((value) => (value <= 0 ? Infinity : value)),
    ),
    -1,
  ),
  title: string("A origin's title must be a string"),
});

export type JavadocCommandOriginSchemaOutput = InferOutput<
  typeof JavadocCommandOriginSchema
>;
