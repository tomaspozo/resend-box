import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createInterface } from 'readline';
import { nanoid } from 'nanoid';

interface InitConfig {
  httpPort: number;
  smtpPort: number;
  smtpHost: string;
}

interface ProposedChanges {
  envFile?: {
    path: string;
    newVars: string[];
    updatedVars: string[];
  };
  configToml?: {
    path: string;
    action: 'create' | 'update' | 'append';
  };
}

/**
 * Prompts user for yes/no confirmation
 */
const askConfirmation = (question: string): Promise<boolean> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

/**
 * Detects SMTP_HOST context based on project structure
 */
const detectSmtpHost = (cwd: string): string => {
  const supabaseDir = join(cwd, 'supabase');
  const dockerfilePath = join(cwd, 'Dockerfile');
  const dockerComposePath = join(cwd, 'docker-compose.yml');

  // Check for Supabase directory
  if (existsSync(supabaseDir) && statSync(supabaseDir).isDirectory()) {
    return 'host.docker.internal';
  }

  // Check for Docker-related files
  if (existsSync(dockerfilePath) || existsSync(dockerComposePath)) {
    return 'host.docker.internal';
  }

  // Default to localhost for local development
  return '127.0.0.1';
};

/**
 * Gets ports from environment variables with defaults
 */
const getPorts = (): { httpPort: number; smtpPort: number } => {
  const httpPort = parseInt(
    process.env.RESEND_SANDBOX_HTTP_PORT || '4657',
    10
  );
  const smtpPort = parseInt(
    process.env.RESEND_SANDBOX_SMTP_PORT || '1025',
    10
  );

  return {
    httpPort: isNaN(httpPort) ? 4657 : httpPort,
    smtpPort: isNaN(smtpPort) ? 1025 : smtpPort,
  };
};

/**
 * Generates a random RESEND_API_KEY if it doesn't exist in content
 */
const getOrGenerateApiKey = (content: string): string => {
  const apiKeyRegex = /^RESEND_API_KEY=(.+)$/m;
  const match = content.match(apiKeyRegex);
  
  if (match && match[1]) {
    // Return existing key (trimmed)
    return match[1].trim();
  }
  
  // Generate new random key starting with re_
  return `re_${nanoid(32)}`;
};

/**
 * Updates or adds environment variable in content
 */
const updateEnvVar = (
  content: string,
  key: string,
  value: string
): { content: string; updated: boolean } => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const exists = regex.test(content);

  if (exists) {
    return {
      content: content.replace(regex, `${key}=${value}`),
      updated: true,
    };
  } else {
    const newLine = content && !content.endsWith('\n') ? '\n' : '';
    return {
      content: `${content}${newLine}${key}=${value}\n`,
      updated: false,
    };
  }
};

/**
 * Updates or adds multiple environment variables
 */
const updateEnvVars = (
  content: string,
  vars: Record<string, string>
): { content: string; newVars: string[]; updatedVars: string[] } => {
  let newContent = content;
  const newVars: string[] = [];
  const updatedVars: string[] = [];

  for (const [key, value] of Object.entries(vars)) {
    const result = updateEnvVar(newContent, key, value);
    newContent = result.content;
    if (result.updated) {
      updatedVars.push(key);
    } else {
      newVars.push(key);
    }
  }

  return { content: newContent, newVars, updatedVars };
};

/**
 * Finds config.toml in root or supabase directory
 */
const findConfigToml = (cwd: string): string | null => {
  const rootPath = join(cwd, 'config.toml');
  const supabasePath = join(cwd, 'supabase', 'config.toml');

  if (existsSync(supabasePath)) {
    return supabasePath;
  }
  if (existsSync(rootPath)) {
    return rootPath;
  }
  return null;
};

/**
 * Updates or adds [auth.email.smtp] section in config.toml
 */
const updateConfigToml = (
  content: string,
  smtpConfig: {
    host: string;
    port: number;
    user: string;
    password: string;
    adminEmail: string;
    senderName: string;
  }
): { content: string; action: 'update' | 'append' } => {
  const smtpSectionRegex =
    /^\[auth\.email\.smtp\](?:\r?\n(?:[^\r\n]*(?:\r?\n|$))*?)(?=\[|$)/m;

  const smtpSection = `[auth.email.smtp]
enabled = true
host = "env(SMTP_HOST)"
port = "env(SMTP_PORT)"
user = "env(SMTP_USER)"
pass = "env(SMTP_PASSWORD)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"`;

  // Check if section exists
  if (smtpSectionRegex.test(content)) {
    // Update existing section
    return {
      content: content.replace(smtpSectionRegex, smtpSection + '\n'),
      action: 'update',
    };
  }

  // Check if [auth] section exists
  const authSectionRegex = /^\[auth\]/m;
  if (authSectionRegex.test(content)) {
    // Find the end of [auth] section - match [auth] and all lines until next [ or end of file
    // Lines that belong to [auth] are those that don't start with [
    const lines = content.split(/\r?\n/);
    let authStartIndex = -1;
    let authEndIndex = lines.length;

    // Find where [auth] section starts
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '[auth]') {
        authStartIndex = i;
        break;
      }
    }

    if (authStartIndex !== -1) {
      // Find where [auth] section ends (next line starting with [ or end of file)
      for (let i = authStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // If line starts with [ (and is not empty), it's a new section
        if (line.startsWith('[') && line.length > 1) {
          authEndIndex = i;
          break;
        }
      }

      // Insert the new section after the [auth] section
      const beforeLines = lines.slice(0, authEndIndex);
      const afterLines = lines.slice(authEndIndex);
      
      // Reconstruct content with new section inserted
      const before = beforeLines.join('\n');
      const after = afterLines.join('\n');
      
      // Add newline after before section if it doesn't end with one
      const beforeWithNewline = before && !before.endsWith('\n') ? `${before}\n` : before;
      // Add newline before after section if there is content after
      const afterWithNewline = after ? `\n${after}` : '';
      
      return {
        content: `${beforeWithNewline}${smtpSection}${afterWithNewline}`,
        action: 'append',
      };
    }
  }

  // Append at the end
  const newLine = content && !content.endsWith('\n') ? '\n' : '';
  return {
    content: `${content}${newLine}${smtpSection}\n`,
    action: 'append',
  };
};

/**
 * Analyzes what changes need to be made
 */
const analyzeChanges = (
  cwd: string,
  config: InitConfig,
  baseUrl: string
): ProposedChanges => {
  const changes: ProposedChanges = {};

  // Check environment file
  const envLocalPath = join(cwd, '.env.local');
  const envPath = join(cwd, '.env');
  const envTargetPath = existsSync(envLocalPath) ? envLocalPath : envPath;

  if (existsSync(envTargetPath)) {
    const content = readFileSync(envTargetPath, 'utf-8');
    const apiKey = getOrGenerateApiKey(content);
    const envVars = {
      RESEND_API_KEY: apiKey,
      RESEND_BASE_URL: baseUrl,
      SMTP_HOST: config.smtpHost,
      SMTP_PORT: config.smtpPort.toString(),
      SMTP_USER: 'admin',
      SMTP_PASSWORD: 'admin',
      SMTP_ADMIN_EMAIL: '"no-reply@sandbox.local"',
      SMTP_SENDER_NAME: '"Sandbox"',
    };

    const result = updateEnvVars(content, envVars);
    if (result.newVars.length > 0 || result.updatedVars.length > 0) {
      changes.envFile = {
        path: envTargetPath,
        newVars: result.newVars,
        updatedVars: result.updatedVars,
      };
    }
  } else {
    // File doesn't exist, will create it
    const apiKey = getOrGenerateApiKey('');
    changes.envFile = {
      path: envTargetPath,
      newVars: [
        'RESEND_API_KEY',
        'RESEND_BASE_URL',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_ADMIN_EMAIL',
        'SMTP_SENDER_NAME',
      ],
      updatedVars: [],
    };
  }

  // Check config.toml
  const configTomlPath = findConfigToml(cwd);
  if (configTomlPath) {
    const content = readFileSync(configTomlPath, 'utf-8');
    const smtpSectionRegex =
      /^\[auth\.email\.smtp\](?:\r?\n(?:[^\r\n]*(?:\r?\n|$))*?)(?=\[|$)/m;

    if (!smtpSectionRegex.test(content)) {
      // Section doesn't exist, will add it
      changes.configToml = {
        path: configTomlPath,
        action: 'append',
      };
    } else {
      // Section exists, will update it
      changes.configToml = {
        path: configTomlPath,
        action: 'update',
      };
    }
  }

  return changes;
};

/**
 * Applies the proposed changes
 */
const applyChanges = (
  cwd: string,
  config: InitConfig,
  changes: ProposedChanges,
  baseUrl: string
): void => {
  // Apply environment file changes
  if (changes.envFile) {
    let content = '';
    if (existsSync(changes.envFile.path)) {
      content = readFileSync(changes.envFile.path, 'utf-8');
    }
    const apiKey = getOrGenerateApiKey(content);
    
    const envVars = {
      RESEND_API_KEY: apiKey,
      RESEND_BASE_URL: baseUrl,
      SMTP_HOST: config.smtpHost,
      SMTP_PORT: config.smtpPort.toString(),
      SMTP_USER: 'admin',
      SMTP_PASSWORD: 'admin',
      SMTP_ADMIN_EMAIL: '"no-reply@sandbox.local"',
      SMTP_SENDER_NAME: '"Sandbox"',
    };

    const result = updateEnvVars(content, envVars);
    writeFileSync(changes.envFile.path, result.content, 'utf-8');

    const newCount = changes.envFile.newVars.length;
    const updatedCount = changes.envFile.updatedVars.length;
    if (newCount > 0 && updatedCount > 0) {
      console.log(
        `✅ Updated ${changes.envFile.path} (${newCount} new, ${updatedCount} updated)`
      );
    } else if (newCount > 0) {
      console.log(`✅ Added ${newCount} variables to ${changes.envFile.path}`);
    } else {
      console.log(
        `✅ Updated ${updatedCount} variables in ${changes.envFile.path}`
      );
    }
  }

  // Apply config.toml changes
  if (changes.configToml) {
    let content = '';
    if (existsSync(changes.configToml.path)) {
      content = readFileSync(changes.configToml.path, 'utf-8');
    }

    const result = updateConfigToml(content, {
      host: config.smtpHost,
      port: config.smtpPort,
      user: 'admin',
      password: 'admin',
      adminEmail: 'no-reply@sandbox.local',
      senderName: 'Sandbox',
    });

    writeFileSync(changes.configToml.path, result.content, 'utf-8');

    if (result.action === 'update') {
      console.log(
        `✅ Updated [auth.email.smtp] section in ${changes.configToml.path}`
      );
  } else {
      console.log(
        `✅ Added [auth.email.smtp] section to ${changes.configToml.path}`
      );
    }
  }
};

/**
 * Shows summary of proposed changes
 */
const showSummary = (config: InitConfig, changes: ProposedChanges): void => {
  console.log('\n📋 Configuration Summary\n');
  console.log(`HTTP Port: ${config.httpPort}`);
  console.log(`SMTP Port: ${config.smtpPort}`);
  console.log(`SMTP Host: ${config.smtpHost}`);
  console.log('\n📝 Proposed Changes:\n');

  if (changes.envFile) {
    console.log(`Environment file: ${changes.envFile.path}`);
    if (changes.envFile.newVars.length > 0) {
      console.log(`  ➕ New variables: ${changes.envFile.newVars.join(', ')}`);
    }
    if (changes.envFile.updatedVars.length > 0) {
      console.log(
        `  🔄 Updated variables: ${changes.envFile.updatedVars.join(', ')}`
      );
    }
    console.log('');
  }

  if (changes.configToml) {
    console.log(`config.toml: ${changes.configToml.path}`);
    console.log(
      `  ${changes.configToml.action === 'update' ? '🔄 Update' : '➕ Add'} [auth.email.smtp] section`
    );
    console.log('');
  }

  if (!changes.envFile && !changes.configToml) {
    console.log('  ✓ No changes needed - everything is already configured!\n');
  }
};

/**
 * Initializes Resend Box configuration in the project
 */
export const initCommand = async (baseUrl?: string): Promise<void> => {
  const cwd = process.cwd();

  // Get ports from environment variables
  const ports = getPorts();
  const httpPort = ports.httpPort;
  const smtpPort = ports.smtpPort;

  // Use provided baseUrl or construct from detected ports
  const finalBaseUrl =
    baseUrl || `http://127.0.0.1:${httpPort}`;

  // Detect SMTP host context
  const smtpHost = detectSmtpHost(cwd);

  const config: InitConfig = {
    httpPort,
    smtpPort,
    smtpHost,
  };

  // Analyze what changes need to be made
  const changes = analyzeChanges(cwd, config, finalBaseUrl);

  // Show summary
  showSummary(config, changes);

  // If no changes needed, exit early
  if (!changes.envFile && !changes.configToml) {
    console.log('💡 Your Resend SDK is already configured!');
    console.log('   Start the sandbox with: npx resend-box start\n');
    return;
  }

  // Ask for confirmation
  const confirmed = await askConfirmation(
    'Do you want to apply these changes?'
  );

  if (!confirmed) {
    console.log('\n❌ Cancelled. No changes were made.\n');
    return;
  }

  // Apply changes
  console.log('\n🔧 Applying changes...\n');
  applyChanges(cwd, config, changes, finalBaseUrl);

  console.log('\n💡 Your Resend SDK will now use the local sandbox!');
  console.log('   Start the sandbox with: npx resend-box start\n');
};
