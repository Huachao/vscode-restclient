# HttpKeeper — lo que añade este REST Client mantenido

> Esta es la versión larga, con capturas. El README de la extensión es [la referencia original de Huachao Mao](../README.md), conservada íntegra.

**Envía peticiones HTTP desde un fichero `.http` y lee la respuesta en el editor.** Sin cuenta, sin nube, sin muro de pago, sin telemetría.

Fork mantenido de [REST Client](https://github.com/Huachao/vscode-restclient), de **Huachao Mao** (MIT): 7,5 millones de instalaciones, 4,9 estrellas y sin una versión nueva desde junio de 2022. El mismo formato `.http`, los mismos ajustes, recogido y puesto al día.

![La petición a la izquierda, la respuesta a la derecha](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/01-send.png)

## Por qué existe este fork

El original no está roto: está parado. Su repositorio acumula **529 incidencias y 61 propuestas de cambio** que nadie fusiona, y el motivo es concreto: el proyecto **no tenía ni una prueba**. Fusionar sesenta y un parches de desconocidos sin red es echarlo a cara o cruz, así que nadie lo hizo en cuatro años.

Por eso lo primero que se hizo aquí no fue una función. Fue la red.

|                                  | Original             | HttpKeeper                                                            |
| -------------------------------- | -------------------- | --------------------------------------------------------------------- |
| Pruebas                          | 0                    | **66** (31 unitarias, 35 de integración contra un servidor de verdad) |
| Vulnerabilidades en dependencias | 75 (6 críticas)      | **0**                                                                 |
| Paquetes                         | 1.487                | **400**                                                               |
| Telemetría                       | Application Insights | **ninguna**                                                           |

`aws-amplify` —el SDK entero de AWS, con GraphQL, DataStore y predicción automática— entraba para hacer un inicio de sesión de Cognito. Ahora son sesenta líneas que hablan con Cognito por HTTP: **1.088 paquetes menos**.

## Lo que se añade

Tres fallos que sus usuarios llevaban años sufriendo, arreglados: la respuesta que **no aparecía en Cursor**, una petición reenviada que salía con las cabeceras ya manipuladas, y un JSONPath con varios resultados que devolvía solo el primero sin decir nada. Y dos propuestas **rechazadas** después de probarlas: una que decía arreglar IPv6 y lo que hacía era romper `localhost`, y la más votada de todas, que ejecutaba órdenes del sistema tomadas del propio fichero `.http`.

Después, lo que la gente pedía desde 2018, cada cosa con sus votos.

### El formato de JetBrains, completo (+235 votos)

Los entornos viven junto al fichero, en `http-client.env.json` (compartido) y `http-client.private.env.json` (el tuyo, en `.gitignore`, y manda). Los ficheros se importan entre sí y ejecutan las peticiones de los otros. La respuesta de una petición está disponible en todo fichero que importe al suyo.

```http
import ./lib/auth.http

run #login

###
GET {{host}}/facturas
Authorization: Bearer {{login.response.body.$.token}}
X-Api-Key: {{$secret API_KEY}}
```

`{{$secret NOMBRE}}` lee el almacén de secretos cifrado del editor: el fichero nunca contiene el valor, así que se puede commitear entero. `{{$uuid}}`, `{{$isoTimestamp}}` y `{{$random.integer(1,10)}}` funcionan como en IntelliJ.

![El token de una respuesta usado en la petición siguiente](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/02-chain.png)

### Ejecutar todas las peticiones de un fichero, en orden (+62), con comprobaciones escritas en el fichero (+59)

```http
# @name login
POST {{host}}/auth
Content-Type: application/json

{"user": "ana"}

# @assert status == 200
# @assert body.$.token exists
# @assert header.content-type contains json
# @assert time < 2000
```

Las comprobaciones son comentarios `@`, de modo que cualquier otra herramienta que lea el formato las ignora.

### Streaming (+72)

`text/event-stream` —como responde toda API de modelos en 2026— se pinta en el panel **según llega**. Cancelar conserva lo recibido. Se puede comprobar `sse.count`, `sse.first` y `sse.last`.

![Una respuesta SSE creciendo evento a evento](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/05-stream.png)

`WEBSOCKET wss://host/socket` con la sintaxis de JetBrains: los mensajes en el cuerpo separados por `===`, `# @timeout 3000` para decir cuánto se escucha, y una transcripción (`>>` enviado, `<<` recibido) como respuesta.

### El cliente HTTP que usan tus agentes

En VS Code, `#httpkeeper` lista las peticiones de un fichero y envía una por su nombre desde el chat de Copilot o cualquier otro participante con modelo de lenguaje; enviar te pregunta antes, y un fichero fuera del espacio de trabajo se rechaza. En VS Code 1.101 o posterior la extensión también anuncia su servidor MCP al modo agente, sin configurar nada.

Fuera del editor, `httpkeeper mcp` es un servidor MCP por stdio para Claude Code, Cursor o cualquier otro que hable MCP: `list_requests`, `send_request`, `run_http_file`. Sólo lee ficheros bajo la raíz con la que arranca y nunca escribe en disco.

```json
{
  "mcpServers": {
    "httpkeeper": {
      "command": "npx",
      "args": ["httpkeeper-cli", "mcp", "--raiz", "."]
    }
  }
}
```

### El ejecutor, en todas partes (+44)

```console
$ npx httpkeeper-cli api.http --env dev --secret API_KEY=… --junit informe.xml
  ok   login                200  184 ms
  ok   facturas             200    9 ms

2 peticiones, todo en verde
```

Devuelve 0 si todas las comprobaciones pasan y 1 si falla alguna; `--json` para las máquinas y `--junit` para los paneles de pruebas de GitHub y GitLab. El cURL pegado y los cuerpos multiparte con `< fichero` también funcionan en la terminal. En GitHub Actions:

```yaml
- uses: TecniartGalicia/httpkeeper@v1
  with:
    file: api/smoke.http
    env: staging
    junit: httpkeeper.xml
  env:
    HTTPKEEPER_SECRET_API_KEY: ${{ secrets.API_KEY }}
```

![El mismo fichero, ejecutado en la terminal integrada](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/04-runner.png)

## Referencia completa

Todo lo heredado de REST Client —sintaxis de las peticiones, GraphQL, cURL, autenticación (Basic, Digest, certificados de cliente, Azure AD, AWS), variables, entornos, generación de código, ajustes— está documentado íntegro en el [README](../README.md) (en inglés, el texto original). No se quitó nada.

## Venir desde REST Client

No hay que hacer nada. El formato `.http` es idéntico —lo usa hasta JetBrains— y **tus ajustes `rest-client.*` se siguen leyendo**, así que ocho años de configuración siguen funcionando. Los tuyos propios de `httpkeeper.*` mandan en cuanto los pongas. El historial, las cookies y los entornos se leen de la misma carpeta `~/.rest-client`, así que también te los llevas.

La interfaz está en castellano y en inglés.

## Lo que no hace

Ni interfaz tipo Postman, ni colecciones en la nube, ni sincronización de equipo, ni cuentas. El producto es un fichero de texto en tu repositorio y así se queda.

Del formato de JetBrains faltan todavía `run #nombre (@var = valor)` con variables en línea y los scripts `> {% … %}`. WebSocket necesita el `WebSocket` que trae Node 22 o posterior (VS Code lo lleva; un `node` más viejo recibe un mensaje claro).

## Reconocimiento

Todo el comportamiento bien resuelto que hay aquí dentro es obra de Huachao Mao, y sigue bajo MIT. Los cambios se le ofrecen de vuelta. Si el original vuelve a la vida, mejor para todos.

---

Argalla · Tecniart Galicia, S.L. — [English](HTTPKEEPER.md)
