"use strict";

export class HttpResponseTimingPhases {
    public constructor(
        public total: number,
        public wait: number,
        public dns: number,
        public tcp: number,
        public firstByte: number,
        public download: number) {
    }
}