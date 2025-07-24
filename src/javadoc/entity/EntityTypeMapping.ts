import { type EntityType, EntityTypeEnum } from 'javadocs-scraper';
import type { AnyJavaMember } from '../types/AnyJavaMember.js';
import type { AnyJavaObject } from '../types/AnyJavaObject.js';
import { MemberEntitiesTypeMappingEnum } from './MemberEntitiesTypeMappingEnum.js';
import {
  type ObjectEntitiesTypeMapping,
  ObjectEntitiesTypeMappingEnum,
} from './ObjectEntitiesTypeMappingEnum.js';

export const AnyEntityTypeMappingEnum = {
  ...ObjectEntitiesTypeMappingEnum,
  ...MemberEntitiesTypeMappingEnum,
} as const satisfies Record<
  Exclude<
    EntityType,
    | typeof EntityTypeEnum.ExternalObject
    | typeof EntityTypeEnum.Package
    | typeof EntityTypeEnum.MethodTypeParameter
    | typeof EntityTypeEnum.MethodReturn
    | typeof EntityTypeEnum.ObjectTypeParameter
    | typeof EntityTypeEnum.Parameter
  >,
  number
>;

export type AnyEntityTypeMapping =
  (typeof AnyEntityTypeMappingEnum)[keyof typeof AnyEntityTypeMappingEnum];

type ToEntityTypeReturn<T extends AnyEntityTypeMapping> = ReturnType<
  typeof fromMappingToEntityType<T>
>;

export function fromMappingToEntityType<T extends AnyEntityTypeMapping>(
  mapping: T,
): T extends ObjectEntitiesTypeMapping
  ? AnyJavaObject['entityType']
  : AnyJavaMember['entityType'] {
  switch (mapping) {
    case ObjectEntitiesTypeMappingEnum[EntityTypeEnum.Annotation]:
      return EntityTypeEnum.Annotation as ToEntityTypeReturn<T>;
    case ObjectEntitiesTypeMappingEnum[EntityTypeEnum.Class]:
      return EntityTypeEnum.Class as ToEntityTypeReturn<T>;
    case ObjectEntitiesTypeMappingEnum[EntityTypeEnum.Enum]:
      return EntityTypeEnum.Enum as ToEntityTypeReturn<T>;
    case ObjectEntitiesTypeMappingEnum[EntityTypeEnum.Interface]:
      return EntityTypeEnum.Interface as ToEntityTypeReturn<T>;
    case MemberEntitiesTypeMappingEnum[EntityTypeEnum.AnnotationElement]:
      return EntityTypeEnum.AnnotationElement as ToEntityTypeReturn<T>;
    case MemberEntitiesTypeMappingEnum[EntityTypeEnum.Field]:
      return EntityTypeEnum.Field as ToEntityTypeReturn<T>;
    case MemberEntitiesTypeMappingEnum[EntityTypeEnum.Method]:
      return EntityTypeEnum.Method as ToEntityTypeReturn<T>;
    case MemberEntitiesTypeMappingEnum[EntityTypeEnum.EnumConstant]:
      return EntityTypeEnum.EnumConstant as ToEntityTypeReturn<T>;
    default:
      throw new Error(`Unhandled mapping: ${mapping}`);
  }
}
