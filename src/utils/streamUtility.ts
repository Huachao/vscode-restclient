import { Readable, Stream } from 'stream';

export async function convertStreamToBuffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];
        stream.on('data', buffer => buffers.push(typeof buffer === 'string' ? Buffer.from(buffer) : buffer));
        stream.on('end', () => resolve(Buffer.concat(buffers)));
        stream.on('error', error => reject(error));
        (<any>stream).resume();
    });
}

export async function convertStreamToString(stream: Stream, encoding: string = "UTF-8"): Promise<string> {
    const buffer = await convertStreamToBuffer(stream);
    return buffer.toString(encoding);
}

export function convertBufferToStream(buffer: Buffer): Stream {
    return new Readable({
        read() {
            this.push(buffer);
            this.push(null);
        }
    });
}