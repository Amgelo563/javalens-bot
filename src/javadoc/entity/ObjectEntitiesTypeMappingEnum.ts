import { EntityTypeEnum } from 'javadocs-scraper';
import type { AnyJavaObject } from '../types/AnyJavaObject.js';

export const ObjectEntitiesTypeMappingEnum = {
  [EntityTypeEnum.Annotation]: 0,
  [EntityTypeEnum.Class]: 1,
  [EntityTypeEnum.Enum]: 2,
  [EntityTypeEnum.Interface]: 3,
} as const satisfies Record<AnyJavaObject['entityType'], number>;

export type ObjectEntitiesTypeMapping =
  (typeof ObjectEntitiesTypeMappingEnum)[keyof typeof ObjectEntitiesTypeMappingEnum];
