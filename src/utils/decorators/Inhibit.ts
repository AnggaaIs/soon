import { CommandContext } from "@soon/structures/CommandContext";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return,  */

export function Inhibit<T extends (ctx: CommandContext) => any>(func: T) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as T;
    descriptor.value = async function (ctx: CommandContext): Promise<any> {
      const result = await func(ctx);
      if (!result) return Reflect.apply(originalMethod, this, [ctx]);
      return undefined;
    };
    return descriptor;
  };
}
