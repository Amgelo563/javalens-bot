import {
  enum as enumSchema,
  type InferOutput,
  literal,
  number,
  object,
  record,
  string,
} from 'valibot';
import { MemberEntitiesTypeMappingEnum } from '../../../javadoc/entity/MemberEntitiesTypeMappingEnum.js';
import { ObjectEntitiesTypeMappingEnum } from '../../../javadoc/entity/ObjectEntitiesTypeMappingEnum.js';

// uses short keys to save file space
export const AutocompleteDataSchema = object({
  // version
  v: literal(1),
  // timestamp
  d: number(),
  // object autocompletions
  o: record(
    // id, file name
    string(),
    object({
      // autocomplete message
      m: string(),
      // original name without count suffix
      n: string(),
      // entity type
      t: enumSchema(ObjectEntitiesTypeMappingEnum),
    }),
  ),
  // member autocompletions
  m: record(
    // id, file name
    string(),
    object({
      // autocomplete message
      m: string(),
      // original name without count suffix
      n: string(),
      // entity type
      t: enumSchema(MemberEntitiesTypeMappingEnum),
    }),
  ),
});

export type AutocompleteDataSchemaOutput = InferOutput<
  typeof AutocompleteDataSchema
>;
