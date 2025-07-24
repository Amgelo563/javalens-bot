import { EntityTypeEnum } from 'javadocs-scraper';
import type { AnyJavaMember } from '../types/AnyJavaMember.js';

export const MemberEntitiesTypeMappingEnum = {
  [EntityTypeEnum.AnnotationElement]: 4,
  [EntityTypeEnum.Field]: 5,
  [EntityTypeEnum.Method]: 6,
  [EntityTypeEnum.EnumConstant]: 7,
} as const satisfies Record<AnyJavaMember['entityType'], number>;

export type MemberEntitiesTypeMapping =
  (typeof MemberEntitiesTypeMappingEnum)[keyof typeof MemberEntitiesTypeMappingEnum];
