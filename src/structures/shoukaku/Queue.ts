import { Track } from "shoukaku";

export class LavalinkQueue extends Array<Track> {
  public get current(): Track | undefined {
    return this[this.indexCurrent];
  }

  public previous: Track | null = null;

  public indexCurrent = 0;

  public get size(): number {
    return this.length - (this.current === undefined ? 0 : 1);
  }

  public get totalSize(): number {
    return this.length;
  }

  public isEmpty(): boolean {
    return this.length === 0;
  }

  public get currentThumbnail(): string {
    return `https://img.youtube.com/vi/${this.current?.info.identifier}/mqdefault.jpg`;
  }

  public shuffle(): void {
    for (let i = this.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
    }
  }
}
