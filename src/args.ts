import { parseHeaderArg } from "./auth.js";
import type { FilterOptions } from "./filter.js";

export interface CliArgs {
  source?: string;
  baseUrl?: string;
  headers: Record<string, string>;
  name?: string;
  list: boolean;
  help: boolean;
  filter: FilterOptions;
}

/** Returns the value for a flag, or throws if it's missing/empty. */
function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value === "") throw new Error(`${flag} requires a value`);
  return value;
}

/** Parses argv into structured CLI args. Throws on malformed flag values. */
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    headers: {},
    list: false,
    help: false,
    filter: { tags: [], excludeTags: [], methods: [], include: [], exclude: [] }
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "--list":
        args.list = true;
        break;
      case "--base-url":
        args.baseUrl = requireValue(arg, argv[++i]);
        break;
      case "--name":
        args.name = requireValue(arg, argv[++i]);
        break;
      case "--header": {
        const parsed = parseHeaderArg(argv[++i] ?? "");
        if (parsed) args.headers[parsed[0]] = parsed[1];
        break;
      }
      case "--tag":
        args.filter.tags!.push(requireValue(arg, argv[++i]));
        break;
      case "--exclude-tag":
        args.filter.excludeTags!.push(requireValue(arg, argv[++i]));
        break;
      case "--method":
        args.filter.methods!.push(requireValue(arg, argv[++i]));
        break;
      case "--read-only":
        args.filter.readOnly = true;
        break;
      case "--include":
        args.filter.include!.push(requireValue(arg, argv[++i]));
        break;
      case "--exclude":
        args.filter.exclude!.push(requireValue(arg, argv[++i]));
        break;
      case "--max-tools": {
        const raw = requireValue(arg, argv[++i]);
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          throw new Error(`--max-tools requires a positive integer, got ${JSON.stringify(raw)}`);
        }
        args.filter.maxTools = Math.floor(n);
        break;
      }
      default:
        if (!arg.startsWith("-") && args.source === undefined) args.source = arg;
    }
  }
  return args;
}
