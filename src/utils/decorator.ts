/**
 * Marca métodos que antes enviaban telemetría.
 *
 * Rest Client no envía nada a ninguna parte: el decorador se conserva vacío para
 * no tocar diez controladores y para que quede constancia de dónde estaba.
 */
export function trace(_eventName: string): MethodDecorator {
    return (_target, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => descriptor;
}
