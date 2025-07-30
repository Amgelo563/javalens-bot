import {
  type AnnotationElementData,
  type ClassData,
  type EnumConstantData,
  type FieldData,
  type InterfaceData,
  type MethodData,
} from 'javadocs-scraper';

export type AnyJavaMember =
  | FieldData<ClassData | InterfaceData | null>
  | MethodData<ClassData | InterfaceData | null>
  | AnnotationElementData
  | EnumConstantData;
