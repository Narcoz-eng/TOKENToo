import {
  ProxyFailure as RootProxyFailure,
  buildTargetUrl,
  classifyProxyError,
  forwardedHeaders as rootForwardedHeaders,
  methodAllowsBody,
  normalizeIncomingRequest,
  resolveBackendBaseUrl
} from "../api/proxy-core";
import {
  ProxyFailure as AppProxyFailure,
  allowsBody,
  classify,
  forwardedHeaders,
  resolveBackendTarget,
  resolveForwardedPath
} from "../frontend/app/api/[...path]/proxy-core";

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [
  {
    name: "root proxy builds valid backend URL with nested path",
    run: () => {
      const backend = resolveBackendBaseUrl({ BACKEND_URL: "http://localhost:4000/" });
      assert(backend?.source === "BACKEND_URL", "BACKEND_URL source was not recorded");
      const incoming = normalizeIncomingRequest("/api/product/collections/example?wallet=test");
      const target = buildTargetUrl(backend.url, incoming.forwardedPath, incoming.search);
      assertEqual(target.toString(), "http://localhost:4000/product/collections/example?wallet=test");
    }
  },
  {
    name: "root proxy missing backend URL falls back to embedded mode",
    run: () => {
      assert(resolveBackendBaseUrl({}) === null, "Missing backend URL should return null for embedded root handler");
    }
  },
  {
    name: "root proxy invalid backend URL is structured",
    run: () => {
      const error = expectThrows(() => resolveBackendBaseUrl({ BACKEND_URL: "://bad" }), RootProxyFailure);
      assertEqual(error.code, "INVALID_BACKEND_URL");
    }
  },
  {
    name: "root proxy backend URL missing protocol is structured",
    run: () => {
      const error = expectThrows(() => resolveBackendBaseUrl({ BACKEND_URL: "localhost:4000" }), RootProxyFailure);
      assertEqual(error.code, "INVALID_BACKEND_PROTOCOL");
    }
  },
  {
    name: "root proxy removes duplicate slashes",
    run: () => {
      const backend = resolveBackendBaseUrl({ API_BACKEND_URL: "http://localhost:4000//" });
      assert(backend, "Backend URL did not resolve");
      const incoming = normalizeIncomingRequest("/api//product//home");
      const target = buildTargetUrl(backend.url, incoming.forwardedPath, incoming.search);
      assertEqual(target.toString(), "http://localhost:4000/product/home");
    }
  },
  {
    name: "root proxy preserves query params",
    run: () => {
      const backend = resolveBackendBaseUrl({ BACKEND_URL: "http://localhost:4000" });
      assert(backend, "Backend URL did not resolve");
      const incoming = normalizeIncomingRequest("/api/product/profile?wallet=test&tab=owned");
      const target = buildTargetUrl(backend.url, incoming.forwardedPath, incoming.search);
      assertEqual(target.toString(), "http://localhost:4000/product/profile?wallet=test&tab=owned");
    }
  },
  {
    name: "root Vercel proxy path handling removes catch-all route param",
    run: () => {
      const backend = resolveBackendBaseUrl({ BACKEND_URL: "https://backend.example" });
      assert(backend, "Backend URL did not resolve");
      const incoming = normalizeIncomingRequest("/api/[...path].ts?path=product%2Fhome&wallet=test", { path: "product/home", wallet: "test" });
      const target = buildTargetUrl(backend.url, incoming.forwardedPath, incoming.search);
      assertEqual(incoming.forwardedPath, "/product/home");
      assertEqual(target.toString(), "https://backend.example/product/home?wallet=test");
    }
  },
  {
    name: "root proxy strips hop-by-hop headers",
    run: () => {
      const headers = rootForwardedHeaders({ host: "localhost:3000", connection: "keep-alive", "transfer-encoding": "chunked", "x-client": "ok" }, "root_req");
      assert(headers.get("host") === null, "host header should be stripped");
      assert(headers.get("connection") === null, "connection header should be stripped");
      assert(headers.get("transfer-encoding") === null, "transfer-encoding header should be stripped");
      assertEqual(headers.get("x-client"), "ok");
      assertEqual(headers.get("x-request-id"), "root_req");
    }
  },
  {
    name: "root proxy method body rules are deterministic",
    run: () => {
      assert(methodAllowsBody("POST"), "POST should allow a body");
      assert(!methodAllowsBody("GET"), "GET should not allow a body");
    }
  },
  {
    name: "root proxy classifies consumed request body",
    run: () => {
      const failure = classifyProxyError(new TypeError("Body is unusable"));
      assertEqual(failure.code, "REQUEST_BODY_UNAVAILABLE");
      assertEqual(failure.errorClass, "TypeError");
    }
  },
  {
    name: "app proxy builds valid backend URL with nested path",
    run: () => {
      const resolved = resolveBackendTarget("/product/home", "?wallet=test", { BACKEND_URL: "http://localhost:4000/" }, "production");
      assertEqual(resolved.source, "BACKEND_URL");
      assertEqual(resolved.target.toString(), "http://localhost:4000/product/home?wallet=test");
    }
  },
  {
    name: "app proxy missing backend URL uses dev fallback",
    run: () => {
      const resolved = resolveBackendTarget("/system/health", "", {}, "development");
      assertEqual(resolved.source, "dev-default");
      assertEqual(resolved.target.toString(), "http://127.0.0.1:4000/system/health");
    }
  },
  {
    name: "app proxy invalid backend URL is structured",
    run: () => {
      const error = expectThrows(() => resolveBackendTarget("/system/health", "", { BACKEND_URL: "://bad" }, "production"), AppProxyFailure);
      assertEqual(error.code, "INVALID_BACKEND_URL");
    }
  },
  {
    name: "app proxy backend URL missing protocol is structured",
    run: () => {
      const error = expectThrows(() => resolveBackendTarget("/system/health", "", { BACKEND_URL: "localhost:4000" }, "production"), AppProxyFailure);
      assertEqual(error.code, "INVALID_BACKEND_PROTOCOL");
    }
  },
  {
    name: "app proxy removes duplicate slashes and keeps query params",
    run: () => {
      const resolved = resolveBackendTarget("//generator//presets", "?q=one", { API_BACKEND_URL: "http://localhost:4000//" }, "production");
      assertEqual(resolved.target.toString(), "http://localhost:4000/generator/presets?q=one");
    }
  },
  {
    name: "app route params support async and sync shapes",
    run: async () => {
      assertEqual(await resolveForwardedPath({ params: { path: ["generator", "presets"] } }), "/generator/presets");
      assertEqual(await resolveForwardedPath({ params: Promise.resolve({ path: "product/home" }) }), "/product/home");
      assertEqual(await resolveForwardedPath({ params: {} }), "/");
      assertEqual(await resolveForwardedPath({}), "/");
    }
  },
  {
    name: "app proxy strips hop-by-hop headers",
    run: () => {
      const input = new Headers({ host: "localhost:3000", connection: "keep-alive", "transfer-encoding": "chunked", "x-client": "ok" });
      const headers = forwardedHeaders(input, "app_req");
      assert(headers.get("host") === null, "host header should be stripped");
      assert(headers.get("connection") === null, "connection header should be stripped");
      assert(headers.get("transfer-encoding") === null, "transfer-encoding header should be stripped");
      assertEqual(headers.get("x-client"), "ok");
      assertEqual(headers.get("x-request-id"), "app_req");
    }
  },
  {
    name: "app proxy GET omits body and POST forwards body",
    run: () => {
      assert(!allowsBody("GET"), "GET should not allow a body");
      assert(allowsBody("POST"), "POST should allow a body");
    }
  },
  {
    name: "app proxy classifies consumed request body",
    run: () => {
      const failure = classify(new TypeError("Body is unusable"));
      assertEqual(failure.code, "REQUEST_BODY_UNAVAILABLE");
      assertEqual(failure.errorClass, "TypeError");
    }
  }
];

async function main() {
  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }
}

function expectThrows<T extends new (...args: never[]) => Error>(fn: () => unknown, type: T): InstanceType<T> {
  try {
    fn();
  } catch (error) {
    if (error instanceof type) return error as InstanceType<T>;
    throw new Error(`Expected ${type.name}, got ${String(error)}`);
  }
  throw new Error(`Expected ${type.name}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
