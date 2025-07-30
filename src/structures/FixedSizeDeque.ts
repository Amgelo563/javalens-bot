export class FixedSizeDeque<T> {
  private readonly items: T[];

  private readonly maxSize: number;

  constructor(options: { maxSize: number; items?: T[] }) {
    this.maxSize = options.maxSize;
    this.items = options.items ? options.items.slice(0, options.maxSize) : [];
  }

  public push(item: T): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift();
    }
    this.items.unshift(item);
  }

  public getItems(): ReadonlyArray<T> {
    return this.items;
  }

  public length(): number {
    return this.items.length;
  }
}
