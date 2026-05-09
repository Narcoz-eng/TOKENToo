import { BadRequestException, type Logger } from "@nestjs/common";
import { openAiResponseException } from "./image-providers";
import {
  buildOpenAIImageRequest,
  DEFAULT_OPENAI_IMAGE_MODEL,
  OPENAI_IMAGE_PROMPT_MAX_LENGTH,
  validateOpenAIImageRequest
} from "./openai-image-request";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const baseInput = {
  prompt: "Generate a polished collection concept.",
  model: DEFAULT_OPENAI_IMAGE_MODEL,
  size: "1024x1024",
  quality: "high"
};

const tests: TestCase[] = [
  {
    name: "invalid model is rejected before calling OpenAI",
    run: () => {
      const validation = validationFor({ ...baseInput, model: "not-a-real-image-model" });
      assertIssue(validation, "OPENAI_IMAGE_MODEL_UNSUPPORTED");
      assert(validation.issues[0]?.fix?.includes(`OPENAI_IMAGE_MODEL=${DEFAULT_OPENAI_IMAGE_MODEL}`), "Invalid model fix missing.");
    }
  },
  {
    name: "invalid size is rejected",
    run: () => {
      const validation = validationFor({ ...baseInput, size: "999x999" });
      assertIssue(validation, "OPENAI_IMAGE_SIZE_UNSUPPORTED");
    }
  },
  {
    name: "gpt-image-2 accepts documented flexible sizes",
    run: () => {
      const validation = validationFor({ ...baseInput, model: "gpt-image-2", size: "1536x864" });
      assert(validation.valid, `Flexible gpt-image-2 size should pass: ${validation.issues.map((issue) => issue.message).join("; ")}`);
    }
  },
  {
    name: "unsupported GPT image quality is rejected",
    run: () => {
      const validation = validationFor({ ...baseInput, quality: "hd" });
      assertIssue(validation, "OPENAI_IMAGE_QUALITY_UNSUPPORTED");
    }
  },
  {
    name: "prompt too long is rejected",
    run: () => {
      const validation = validationFor({ ...baseInput, prompt: "x".repeat(OPENAI_IMAGE_PROMPT_MAX_LENGTH + 1) });
      assertIssue(validation, "OPENAI_IMAGE_PROMPT_TOO_LONG");
    }
  },
  {
    name: "bad reference URL is rejected",
    run: () => {
      const validation = validationFor({ ...baseInput, referenceImageUrl: "ipfs://not-openai-fetchable/logo.png" });
      assertIssue(validation, "OPENAI_IMAGE_REFERENCE_URL_INVALID");
    }
  },
  {
    name: "OpenAI 400 body is parsed into an actionable UI message",
    run: async () => {
      const request = buildOpenAIImageRequest({ ...baseInput, model: "gpt-image-2" });
      const exception = await openAiResponseException(
        jsonResponse(400, {
          error: {
            message: "The model `gpt-image-2` does not exist or you do not have access to it.",
            type: "invalid_request_error",
            code: "unsupported_model"
          }
        }),
        request,
        silentLogger
      );
      assert(exception instanceof BadRequestException, "OpenAI 400 should become BadRequestException.");
      const response = exception.getResponse() as { code?: string; message?: string; details?: unknown };
      assert(response.code === "OPENAI_UNSUPPORTED_MODEL", "Unsupported model code was not preserved.");
      assert(response.message?.startsWith("OpenAI image request rejected:"), "UI message should name OpenAI rejection.");
      assert(response.message?.includes(`Set OPENAI_IMAGE_MODEL=${DEFAULT_OPENAI_IMAGE_MODEL}`), "Config fix missing from UI message.");
      assert(!response.message?.includes("sk-"), "UI message leaked an API key pattern.");
    }
  },
  {
    name: "OpenAI billing hard limit is preserved as an actionable reason",
    run: async () => {
      const request = buildOpenAIImageRequest(baseInput);
      const exception = await openAiResponseException(
        jsonResponse(400, {
          error: {
            message: "Billing hard limit has been reached.",
            type: "invalid_request_error",
            code: "billing_hard_limit_reached"
          }
        }),
        request,
        silentLogger
      );
      const response = exception.getResponse() as { code?: string; message?: string; details?: { raw?: unknown } };
      assert(response.code === "OPENAI_REQUEST_REJECTED", "Billing hard limit should be classified as an OpenAI request rejection.");
      assert(response.message?.includes("Billing hard limit has been reached."), "Billing hard limit reason should be visible to the UI.");
      assert(!JSON.stringify(response).includes("sk-"), "Billing error response leaked an API key pattern.");
    }
  }
];

async function main() {
  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }
}

function validationFor(input: Parameters<typeof buildOpenAIImageRequest>[0]) {
  return validateOpenAIImageRequest(buildOpenAIImageRequest(input));
}

function jsonResponse(status: number, value: unknown) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function assertIssue(validation: ReturnType<typeof validateOpenAIImageRequest>, code: string) {
  assert(!validation.valid, "Validation should fail.");
  assert(validation.issues.some((issue) => issue.code === code), `Missing issue ${code}. Found: ${validation.issues.map((issue) => issue.code).join(", ")}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const silentLogger = {
  error() {
    return undefined;
  }
} as unknown as Logger;

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
