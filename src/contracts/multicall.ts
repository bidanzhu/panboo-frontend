import { Contract, Interface, type ContractRunner } from 'ethers';
import { MULTICALL3_ABI } from './abis';
import { getMulticall3Address } from './addresses';
import type { Call3, Call3Result } from '@/types/contracts';

/**
 * Encode a contract call for Multicall3
 */
export function encodeCall(
  contractAddress: string,
  abi: readonly string[],
  functionName: string,
  args: unknown[] = []
): Call3 {
  const iface = new Interface(abi);
  const callData = iface.encodeFunctionData(functionName, args);

  return {
    target: contractAddress,
    allowFailure: true,
    callData,
  };
}

/**
 * Decode a Multicall3 result
 */
export function decodeResult<T>(
  abi: readonly string[],
  functionName: string,
  result: Call3Result
): T | null {
  if (!result.success) {
    console.warn(`Multicall failed for ${functionName}`);
    return null;
  }

  try {
    const iface = new Interface(abi);
    const decoded = iface.decodeFunctionResult(functionName, result.returnData);

    // If single return value, unwrap it
    if (decoded.length === 1) {
      return decoded[0] as T;
    }

    return decoded as T;
  } catch (error) {
    console.error(`Failed to decode result for ${functionName}:`, error);
    return null;
  }
}

/**
 * Create a Multicall3 contract instance
 */
export function createMulticallContract(provider: ContractRunner | null): Contract {
  const address = getMulticall3Address();
  return new Contract(address, MULTICALL3_ABI, provider);
}

/**
 * Execute multiple calls using Multicall3
 * This is a utility function that can be used with ethers provider
 */
export async function executeMulticall(
  provider: ContractRunner | null,
  calls: Call3[]
): Promise<Call3Result[]> {
  try {
    const multicall = createMulticallContract(provider);

    const result = await multicall.aggregate3(calls);

    return result as Call3Result[];
  } catch (error) {
    console.error('Multicall execution failed:', error);
    // Return failed results for all calls
    return calls.map(() => ({
      success: false,
      returnData: '0x',
    }));
  }
}

/**
 * Helper type for building multicall requests
 */
export interface MulticallRequest {
  target: string;
  abi: readonly string[];
  functionName: string;
  args?: unknown[];
}

/**
 * Build and execute multiple contract calls
 * Returns an array of results in the same order as requests
 */
export async function batchCall<T>(
  provider: ContractRunner | null,
  requests: MulticallRequest[]
): Promise<(T | null)[]> {
  // Encode all calls
  const calls: Call3[] = requests.map(req =>
    encodeCall(req.target, req.abi, req.functionName, req.args)
  );

  // Execute multicall
  const results = await executeMulticall(provider, calls);

  // Decode all results
  return results.map((result, index) => {
    const request = requests[index];
    return decodeResult<T>(request.abi, request.functionName, result);
  });
}

// Utility functions for common multicall patterns

/**
 * Get balances for multiple tokens
 */
export interface TokenBalance {
  token: string;
  balance: bigint;
}

export async function getTokenBalances(
  provider: ContractRunner | null,
  tokenAbi: readonly string[],
  tokens: string[],
  account: string
): Promise<TokenBalance[]> {
  const requests = tokens.map(token => ({
    target: token,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account],
  }));

  const results = await batchCall<bigint>(provider, requests);

  return tokens.map((token, index) => ({
    token,
    balance: results[index] || 0n,
  }));
}

/**
 * Get decimals for multiple tokens
 */
export interface TokenDecimals {
  token: string;
  decimals: number;
}

export async function getTokenDecimals(
  provider: ContractRunner | null,
  tokenAbi: readonly string[],
  tokens: string[]
): Promise<TokenDecimals[]> {
  const requests = tokens.map(token => ({
    target: token,
    abi: tokenAbi,
    functionName: 'decimals',
    args: [],
  }));

  const results = await batchCall<number>(provider, requests);

  return tokens.map((token, index) => ({
    token,
    decimals: results[index] || 18,
  }));
}

/**
 * Get allowances for multiple tokens
 */
export interface TokenAllowance {
  token: string;
  allowance: bigint;
}

export async function getTokenAllowances(
  provider: ContractRunner | null,
  tokenAbi: readonly string[],
  tokens: string[],
  owner: string,
  spender: string
): Promise<TokenAllowance[]> {
  const requests = tokens.map(token => ({
    target: token,
    abi: tokenAbi,
    functionName: 'allowance',
    args: [owner, spender],
  }));

  const results = await batchCall<bigint>(provider, requests);

  return tokens.map((token, index) => ({
    token,
    allowance: results[index] || 0n,
  }));
}
