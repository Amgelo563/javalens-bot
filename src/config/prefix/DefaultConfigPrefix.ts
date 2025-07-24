import { EntityTypeEnum } from 'javadocs-scraper';

export const DefaultConfigPrefix = {
  [EntityTypeEnum.Class]: '🏛️',
  [EntityTypeEnum.Interface]: '🧩',
  [EntityTypeEnum.Enum]: '🔠',
  [EntityTypeEnum.EnumConstant]: '📍',
  [EntityTypeEnum.Method]: '🛠️',
  [EntityTypeEnum.Field]: '🔑',
  [EntityTypeEnum.Annotation]: '🏷️',
  [EntityTypeEnum.AnnotationElement]: '🔖',
} as const;
