import type {
  AnnotationData,
  ClassData,
  EnumData,
  InterfaceData,
} from 'javadocs-scraper';

export type AnyJavaObject =
  | ClassData
  | InterfaceData
  | EnumData
  | AnnotationData;
