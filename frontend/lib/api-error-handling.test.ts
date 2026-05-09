import { ApiError, apiFetch } from "./api";

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const html500 = "<!doctype html><html><body><h1>This page could not be loaded</h1></body></html>";

const tests: TestCase[] = [
  {
    name: "backend offline becomes network error",
    run: async () => {
      mockFetch(() => Promise.reject(new Error("ECONNREFUSED")));
      await expectApiError(() => apiFetch("/product/profile"), "network");
    }
  },
  {
    name: "invalid endpoint returns sanitized 404",
    run: async () => {
      mockFetch(() => Promise.resolve(jsonResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Route not found" } })));
      const error = await expectApiError(() => apiFetch("/missing"), "http");
      assert(!error.message.includes("<html"), "404 message leaked HTML");
    }
  },
  {
    name: "html upstream response is never exposed raw",
    run: async () => {
      mockFetch(() => Promise.resolve(new Response(html500, { status: 500, headers: { "content-type": "text/html" } })));
      const error = await expectApiError(() => apiFetch("/product/profile"), "html_response");
      assert(!error.message.includes("<h1>") && !error.message.includes("This page could not be loaded"), "HTML body leaked into user message");
    }
  },
  {
    name: "malformed json is classified",
    run: async () => {
      mockFetch(() => Promise.resolve(new Response("{ nope", { status: 200, headers: { "content-type": "application/json" } })));
      await expectApiError(() => apiFetch("/product/profile"), "invalid_json");
    }
  },
  {
    name: "timeout is classified",
    run: async () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT_MS = "1";
      mockFetch((_input, init) => {
        const signal = init?.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      });
      await expectApiError(() => apiFetch("/product/profile"), "timeout");
      delete process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
    }
  },
  {
    name: "500 json response is sanitized",
    run: async () => {
      mockFetch(() => Promise.resolve(jsonResponse(500, { success: false, error: { code: "REQUEST_FAILED", message: "The request could not be completed." } })));
      const error = await expectApiError(() => apiFetch("/product/profile"), "backend_unavailable");
      assert(error.message === "The request could not be completed.", "Unexpected 500 message");
    }
  },
  {
    name: "proxy diagnostics expose safe route details",
    run: async () => {
      mockFetch(() =>
        Promise.resolve(
          jsonResponse(500, {
            ok: false,
            error: { code: "API_ROUTE_FAILED", message: "The API route failed before the backend could handle the request." },
            trace: {
              stage: "resolve_backend_url",
              forwardedPath: "/product/home",
              target: "http://127.0.0.1:4000/product/home?secret=hidden",
              targetHost: "127.0.0.1:4000",
              backendUrlSource: "BACKEND_URL",
              preparationErrorClass: "TypeError"
            }
          })
        )
      );
      const error = await expectApiError(() => apiFetch("/product/home"), "backend_unavailable");
      assert(error.message !== "The API route failed before the backend could handle the request.", "Proxy implementation message leaked into UI");
      assert(error.diagnostics.endpointPath === "/product/home", "Endpoint path missing from diagnostics");
      assert(error.diagnostics.proxyStage === "resolve_backend_url", "Proxy stage missing from diagnostics");
      assert(error.diagnostics.targetHost === "127.0.0.1:4000", "Target host was not sanitized");
      assert(error.diagnostics.backendUrlSource === "BACKEND_URL", "Backend URL source missing from diagnostics");
      assert(error.diagnostics.preparationErrorClass === "TypeError", "Preparation error class missing from diagnostics");
    }
  },
  {
    name: "successful json parses",
    run: async () => {
      mockFetch(() => Promise.resolve(jsonResponse(200, { ok: true, data: { user: null, nfts: [] } })));
      const data = await apiFetch<{ ok: boolean; data: unknown }>("/product/profile");
      assert(data.ok === true, "Successful JSON response did not parse");
    }
  }
];

async function main() {
  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }
}

function mockFetch(implementation: typeof fetch) {
  globalThis.fetch = implementation;
}

function jsonResponse(status: number, value: unknown) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "x-request-id": "test_request" } });
}

async function expectApiError(fn: () => Promise<unknown>, kind: ApiError["kind"]): Promise<ApiError> {
  try {
    await fn();
  } catch (error) {
    if (!(error instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(error)}`);
    assert(error.kind === kind, `Expected ${kind}, got ${error.kind}`);
    assert(!/<\/?[a-z][\s\S]*>/i.test(error.message), "Error message contains raw HTML");
    return error;
  }
  throw new Error(`Expected ApiError ${kind}`);
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
