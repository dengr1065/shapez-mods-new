import type { Mod } from "mods/mod";

type AnySignal = TypedSignal<Array<unknown>>;
type ModSignalName = keyof Mod["signals"];

type SignalData<T extends AnySignal> = T extends TypedSignal<
    infer D extends Array<unknown>
>
    ? D
    : never;

type ModSignalData<T extends ModSignalName> = SignalData<Mod["signals"][T]>;

// Kindly stolen from https://2ality.com/2022/10/javascript-decorators.html
export function lazy<H, T>(
    target: () => T,
    context: ClassGetterDecoratorContext<H, T>
): (this: H) => T {
    return function () {
        const cached = target.call(this);
        Object.defineProperty(this, context.name, {
            value: cached,
            writable: false,
        });

        return cached;
    };
}

// A horrible implementation of a very cool thing
export function subscribe<T extends Mod, N extends ModSignalName>(signalName: N) {
    type R = (this: T, ...args: ModSignalData<N>) => void | STOP_PROPAGATION;

    return function (receiver: R, context: ClassMethodDecoratorContext<T, R>) {
        context.addInitializer(function () {
            this.signals[signalName].add(
                receiver as unknown as SignalReceiver<unknown, T>,
                this
            );
        });
    };
}
