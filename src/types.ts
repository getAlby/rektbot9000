/**
 * Configuration options for running goose process
 */
export interface GooseConfig {
  /** The goose binary path (defaults to process.env.GOOSE_BIN or "goose") */
  gooseBin?: string;
  /** Timeout in milliseconds (defaults to 100 minutes) */
  timeout?: number;
  /** Working directory (defaults to "/") */
  cwd?: string;
}

/**
 * Error thrown when goose process fails
 */
export class GooseError extends Error {
  constructor(
    message: string,
    public exitCode: number | null = null,
    public stderr: string = "",
    public stdout: string = ""
  ) {
    super(message);
    this.name = "GooseError";
  }
}