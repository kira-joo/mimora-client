import { ResponseType, type AdapterRequest, type AdapterResponse, type RequestAdapter } from "@kira-joo/frontend-toolkit-core/server";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

/*
 * The toolkit's `RequestAdapter` over Axios, for browser calls to this app's own
 * `/api/session/**` (04 §3: browser calls use the Axios adapter; server reads
 * the fetch adapter). No package ships one — the core README leaves it to the
 * consuming app — so this is the second copy in the workspace (after
 * restaurant-platform/src/lib/api/axios-adapter.ts) and a promotion candidate
 * for `@kira-joo/frontend-toolkit-core`, pending a package release.
 */
function toResponseType(responseType: ResponseType | undefined): AxiosRequestConfig["responseType"] {
  if (responseType === ResponseType.BLOB) return "blob";
  if (responseType === ResponseType.TEXT) return "text";
  return "json";
}

function toHeaderRecord(headers: unknown): Record<string, string> {
  if (!headers) return {};
  const source = typeof (headers as { toJSON?: () => unknown }).toJSON === "function" ? ((headers as { toJSON: () => unknown }).toJSON() as Record<string, unknown>) : (headers as Record<string, unknown>);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) if (value != null) result[key.toLowerCase()] = String(value);
  return result;
}

export function createAxiosAdapter(instance: AxiosInstance): RequestAdapter {
  return async function axiosAdapter(request: AdapterRequest): Promise<AdapterResponse> {
    const response = await instance.request({
      url: request.url,
      method: request.method,
      headers: request.headers,
      data: request.body,
      responseType: toResponseType(request.responseType),
      signal: request.signal,
      ...(request.timeoutMs === undefined ? {} : { timeout: request.timeoutMs }),
      // Never reject on a status: the client must see the parsed error body — field-level validation errors live there.
      validateStatus: () => true,
      ...(request.transport as AxiosRequestConfig | undefined),
    });
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      statusText: response.statusText,
      headers: toHeaderRecord(response.headers),
      data: response.status === 204 || response.data === "" ? undefined : response.data,
    };
  };
}
