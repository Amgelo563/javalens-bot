import { type EntityType, EntityTypeEnum } from 'javadocs-scraper';

export const BroadJavaEntityTypeEnum = {
  // uses these "simple" values to be able to index AutocompleteDataSchema

  Object: 'o',
  Member: 'm',
} as const;

// A "broad" entity type, which is either an object (class, interface, enum, etc.) or a member (field, method, annotation element, etc).
export type BroadJavaEntityType =
  (typeof BroadJavaEntityTypeEnum)[keyof typeof BroadJavaEntityTypeEnum];

const memberTypes = [
  EntityTypeEnum.AnnotationElement,
  EntityTypeEnum.Field,
  EntityTypeEnum.Method,
  EntityTypeEnum.EnumConstant,
] as const;

export function getBroadJavaEntityType(entity: {
  entityType: EntityType;
}): BroadJavaEntityType {
  return memberTypes.includes(entity.entityType as any)
    ? BroadJavaEntityTypeEnum.Member
    : BroadJavaEntityTypeEnum.Object;
}
