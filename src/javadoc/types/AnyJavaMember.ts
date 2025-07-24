import {
  type AnnotationElementData,
  type ClassData,
  type EntityType,
  type EnumConstantData,
  type FieldData,
  type InterfaceData,
  type MethodData,
 EntityTypeEnum } from 'javadocs-scraper';

export type AnyJavaMember =
  | FieldData<ClassData | InterfaceData | null>
  | MethodData<ClassData | InterfaceData | null>
  | AnnotationElementData
  | EnumConstantData;

export function isJavaMember(entity: {
  entityType: EntityType;
}): entity is AnyJavaMember {
  if (!entity || typeof entity !== 'object' || !('entityType' in entity)) {
    return false;
  }

  return [
    EntityTypeEnum.AnnotationElement,
    EntityTypeEnum.Field,
    EntityTypeEnum.Method,
    EntityTypeEnum.EnumConstant,
  ].includes(entity.entityType as any);
}
