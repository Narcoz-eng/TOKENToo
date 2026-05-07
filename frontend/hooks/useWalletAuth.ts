"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export function useWalletAuth() {
  const wallet = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const address = wallet.publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!address) {
      setToken(null);
      return;
    }
    const stored = window.localStorage.getItem(`phew.run.auth.${address}`);
    setToken(stored);
  }, [address]);

  const login = useCallback(async () => {
    if (!address) throw new Error("Connect wallet first");
    if (!wallet.signMessage) throw new Error("Wallet does not support signMessage");
    setLoading(true);
    setError(null);
    try {
      const challenge = await postJson<{ message: string; challengeToken: string }>("/auth/challenge", { walletAddress: address });
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const session = await postJson<{ accessToken: string }>("/auth/login", {
        walletAddress: address,
        message: challenge.message,
        signature: bs58.encode(signature),
        challengeToken: challenge.challengeToken
      });
      window.localStorage.setItem(`phew.run.auth.${address}`, session.accessToken);
      setToken(session.accessToken);
      return session.accessToken;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wallet login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, wallet]);

  const authFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const accessToken = token ?? (await login());
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${accessToken}`);
      if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
      const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
      if (!response.ok) throw new Error(await safeErrorMessage(response));
      return response.json() as Promise<T>;
    },
    [login, token]
  );

  const signTransactionBase64 = useCallback(
    async (base64UnsignedTransaction: string) => {
      if (!wallet.signTransaction) throw new Error("Wallet does not support transaction signing");
      const tx = Transaction.from(Buffer.from(base64UnsignedTransaction, "base64"));
      const signed = await wallet.signTransaction(tx);
      return signed.serialize().toString("base64");
    },
    [wallet]
  );

  return { address, connected: wallet.connected, token, login, authFetch, signTransactionBase64, loading, error };
}

async function postJson<T>(path: string, body: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await safeErrorMessage(response));
  return response.json() as Promise<T>;
}

async function safeErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // Fall back to raw text.
  }
  return body || `Request failed with ${response.status}`;
}
