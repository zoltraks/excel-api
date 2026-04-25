// CLI argument parser for the Excel API Node server

export interface ServerArgs {
  workDir?: string;
  configPath?: string;
  accessPath?: string;
  life?: string;
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ServerArgs {
  const result: ServerArgs = {};

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--work' && i + 1 < argv.length) {
      result.workDir = argv[i + 1];
      i++;
    } else if (argv[i] === '--config' && i + 1 < argv.length) {
      result.configPath = argv[i + 1];
      i++;
    } else if (argv[i] === '--access' && i + 1 < argv.length) {
      result.accessPath = argv[i + 1];
      i++;
    } else if (argv[i] === '--life' && i + 1 < argv.length) {
      result.life = argv[i + 1];
      i++;
    }
  }

  return result;
}
