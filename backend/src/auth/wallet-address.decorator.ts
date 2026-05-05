import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const WalletAddress = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest().walletAddress as string | undefined;
});
