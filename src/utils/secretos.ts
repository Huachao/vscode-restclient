import { l10n, Memento, SecretStorage, window } from 'vscode';

/**
 * `{{$secret NOMBRE}}`: el valor vive en el almacén de secretos de VS Code
 * (cifrado por el sistema operativo), nunca en el fichero `.http`. Así un
 * fichero de peticiones se puede commitear entero, que es lo que pedía #279.
 *
 * El almacén no sabe listar sus claves, así que los nombres se apuntan aparte
 * en el estado global; sólo los nombres, nunca los valores.
 */
export class Secretos {
    private static almacen: SecretStorage | undefined;
    private static estado: Memento | undefined;
    private static readonly CLAVE_NOMBRES = 'rest-client.secretNames';

    public static inicializar(almacen: SecretStorage, estado: Memento) {
        this.almacen = almacen;
        this.estado = estado;
    }

    public static get listo(): boolean {
        return this.almacen !== undefined;
    }

    public static nombres(): string[] {
        return this.estado?.get<string[]>(this.CLAVE_NOMBRES) ?? [];
    }

    public static async get(nombre: string): Promise<string | undefined> {
        return this.almacen?.get(this.clave(nombre));
    }

    public static async set(nombre: string, valor: string): Promise<void> {
        await this.almacen?.store(this.clave(nombre), valor);
        const nombres = new Set(this.nombres());
        nombres.add(nombre);
        await this.estado?.update(this.CLAVE_NOMBRES, [...nombres].sort());
    }

    public static async borrar(nombre: string): Promise<void> {
        await this.almacen?.delete(this.clave(nombre));
        await this.estado?.update(this.CLAVE_NOMBRES, this.nombres().filter(n => n !== nombre));
    }

    /**
     * Pide el valor con un cuadro de contraseña y lo guarda. Es lo que pasa la
     * primera vez que una petición usa un secreto que aún no existe: en vez de
     * fallar, se pregunta.
     */
    public static async pedir(nombre: string): Promise<string | undefined> {
        const valor = await window.showInputBox({
            prompt: l10n.t('Value for secret "{0}" (stored encrypted, never written to the file)', nombre),
            password: true,
            ignoreFocusOut: true,
        });
        if (valor === undefined || valor === '') {
            return undefined;
        }
        await this.set(nombre, valor);
        return valor;
    }

    public static nombreValido(nombre: string): boolean {
        return /^[\w.-]+$/.test(nombre);
    }

    private static clave(nombre: string): string {
        return `rest-client.secret.${nombre}`;
    }
}
