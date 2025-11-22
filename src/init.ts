import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Initializes RESEND_BASE_URL in .env.local or .env file
 */
export const initCommand = async (baseUrl: string = 'http://localhost:4657'): Promise<void> => {
  const cwd = process.cwd();
  const envLocalPath = join(cwd, '.env.local');
  const envPath = join(cwd, '.env');

  // Prefer .env.local, fallback to .env
  const targetPath = existsSync(envLocalPath) ? envLocalPath : envPath;
  const exists = existsSync(targetPath);

  let content = '';
  if (exists) {
    content = readFileSync(targetPath, 'utf-8');
  }

  // Check if RESEND_BASE_URL already exists
  const hasResendBaseUrl = /^RESEND_BASE_URL=/m.test(content);

  if (hasResendBaseUrl) {
    // Update existing RESEND_BASE_URL
    content = content.replace(/^RESEND_BASE_URL=.*$/m, `RESEND_BASE_URL=${baseUrl}`);
    writeFileSync(targetPath, content, 'utf-8');
    console.log(`✅ Updated RESEND_BASE_URL in ${targetPath}`);
  } else {
    // Add new RESEND_BASE_URL
    const newLine = content && !content.endsWith('\n') ? '\n' : '';
    content += `${newLine}RESEND_BASE_URL=${baseUrl}\n`;
    writeFileSync(targetPath, content, 'utf-8');
    console.log(`✅ Added RESEND_BASE_URL to ${targetPath}`);
  }

  console.log(`\n📝 RESEND_BASE_URL=${baseUrl}`);
  console.log('\n💡 Your Resend SDK will now use the local sandbox!');
  console.log('   Start the sandbox with: npx resend-sandbox start\n');
};

