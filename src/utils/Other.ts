String.prototype.toProperCase = function (): string {
  return this.replace(/([^\W_]+[^\s-]*) */g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  }).replace("-", "");
};

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function spliceIntoChunks(array: Array<any>, size: number): Array<any> {
  const a: any[] = [];
  while (array.length > 0) {
    a.push(array.splice(0, size));
  }
  return a;
}

export function classDecorator<T extends (...args: any[]) => any>(target: T): ClassDecorator {
  return target;
}
