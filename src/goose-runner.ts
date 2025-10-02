import { spawn } from "child_process";
import { GooseConfig, GooseError } from "./types";

/**
 * Runs goose process with the given prompt and returns the stdout output
 * @param prompt The prompt to pass to goose
 * @param config Optional configuration for the goose process
 * @returns Promise resolving to the stdout output as a string
 */
export async function runGoose(
  prompt: string,
  systemPrompt?: string,
  config: GooseConfig = {}
): Promise<string> {
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Retrying goose (attempt ${attempt}/${maxRetries})...`);
      }

      const result = await runGooseAttempt(prompt, systemPrompt, config);
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Goose failed after ${maxRetries} attempts`);
        throw error;
      }

      console.warn(
        `Goose attempt ${attempt} failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // This should never be reached due to the throw above, but TypeScript requires it
  throw new GooseError("Maximum retry attempts exceeded");
}

/**
 * Internal function that performs a single goose attempt
 */
async function runGooseAttempt(
  prompt: string,
  systemPrompt?: string,
  config: GooseConfig = {}
): Promise<string> {
  const {
    gooseBin = process.env.GOOSE_BIN || "goose",
    timeout = 1 * 60 * 1000, // 1 minutes
    cwd = "/",
  } = config;

  return new Promise((resolve, reject) => {
    // Create AbortController for timeout/cancellation
    const abortController = new AbortController();
    const { signal } = abortController;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
      reject(new GooseError(`Goose process timed out after ${timeout}ms`));
    }, timeout);

    const gooseProcess = spawn(
      gooseBin,
      [
        "run",
        `-t`,
        prompt,
        ...(systemPrompt ? ["--system", systemPrompt] : []),
        "-q",
      ],
      {
        env: {
          ...process.env,
          GOOSE_MODE: "auto",
        },
        cwd,
        stdio: ["ignore", "pipe", "pipe"], // Pipe stdout/stderr
        signal,
      }
    );

    let stdout = "";
    let stderr = "";

    // Collect stdout data
    gooseProcess.stdout?.on("data", (data: Buffer) => {
      const cleanOutput = data.toString().replace(/\x1B\[[0-?9;]*[mG]/g, "");
      stdout += cleanOutput;
    });

    // Collect stderr data
    gooseProcess.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    // Handle process completion
    gooseProcess.on("close", (code: number | null) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new GooseError(
            `Goose process exited with code ${code}`,
            code,
            stderr,
            stdout
          )
        );
      }
    });

    // Handle process errors
    gooseProcess.on("error", (error: Error) => {
      clearTimeout(timeoutId);
      reject(new GooseError(`Failed to spawn goose process: ${error.message}`));
    });

    // Handle signal abort (timeout or manual cancellation)
    signal.addEventListener("abort", () => {
      gooseProcess.kill("SIGTERM");
    });
  });
}
