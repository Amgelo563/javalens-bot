import type { AnyEntityTypeMapping } from '../../javadoc/entity/EntityTypeMapping.js';

export type CustomIdSchema = {
  id: string;
  type: AnyEntityTypeMapping;
};

/** De/serializes data from/to Discord customIds */
export interface JavadocCustomIdCodec {
  serialize(data: CustomIdSchema): string;
  deserialize(customId: string): CustomIdSchema | null;
}
