import { AxiosResponse } from "axios";
import { HttpResponse } from "../types";

export function convertAxiosResponse(
  axiosResponse: AxiosResponse
): HttpResponse {
  return {
    status: axiosResponse.status,
    headers: Object.fromEntries(
      Object.entries(axiosResponse.headers).map(([key, value]) => [
        key.toLowerCase(),
        String(value),
      ])
    ),
    data: axiosResponse.data !== undefined ? axiosResponse.data : null,
  };
}
