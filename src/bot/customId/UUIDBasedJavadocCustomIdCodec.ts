import { randomUUID, type UUID } from 'node:crypto';
import {
  type CustomIdSchema,
  type JavadocCustomIdCodec,
} from './JavadocCustomIdCodec.js';

export class UUIDBasedJavadocCustomIdCodec implements JavadocCustomIdCodec {
  protected readonly store: Record<UUID, CustomIdSchema> = Object.create(null);

  public serialize(data: CustomIdSchema): string {
    const uuid = randomUUID();
    // technically should never happen, but just in case we're extremely unlucky
    if (this.store[uuid]) {
      throw new Error(`UUID ${uuid} already exists in the store.`);
    }
    this.store[uuid] = data;
    return uuid;
  }

  public deserialize(customId: string): CustomIdSchema | null {
    return this.store[customId as UUID] ?? null;
  }
}
