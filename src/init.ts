import { readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { createInterface } from 'readline'
import { nanoid } from 'nanoid'

interface InitConfig {
  httpPort: number
  smtpPort: number
  smtpHost: string
}

interface ProposedChanges {
  envFile?: {
    path: string
    newVars: string[]
    updatedVars: string[]
  }
  configToml?: {
    path: string
    action: 'create' | 'update' | 'append'
  }
}

/**
 * Prompts user for yes/no confirmation
 */
const askConfirmation = (question: string): Promise<boolean> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Detects if this is a Supabase project by checking for supabase folder
 */
const detectSupabaseProject = (cwd: string): boolean => {
  const supabaseDir = join(cwd, 'supabase')
  return existsSync(supabaseDir) && statSync(supabaseDir).isDirectory()
}

/**
 * Gets ports from environment variables with defaults
 */
const getPorts = (): { httpPort: number; smtpPort: number } => {
  const httpPort = parseInt(process.env.RESEND_SANDBOX_HTTP_PORT || '4657', 10)
  const smtpPort = parseInt(process.env.RESEND_SANDBOX_SMTP_PORT || '1025', 10)

  return {
    httpPort: isNaN(httpPort) ? 4657 : httpPort,
    smtpPort: isNaN(smtpPort) ? 1025 : smtpPort,
  }
}

/**
 * Generates a random RESEND_API_KEY if it doesn't exist in content
 */
const getOrGenerateApiKey = (content: string): string => {
  const apiKeyRegex = /^RESEND_API_KEY=(.+)$/m
  const match = content.match(apiKeyRegex)

  if (match && match[1]) {
    // Return existing key (trimmed)
    return match[1].trim()
  }

  // Generate new random key starting with re_
  return `re_${nanoid(32)}`
}

/**
 * Updates or adds environment variable in content
 */
const updateEnvVar = (
  content: string,
  key: string,
  value: string
): { content: string; updated: boolean } => {
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const exists = regex.test(content)

  if (exists) {
    return {
      content: content.replace(regex, `${key}=${value}`),
      updated: true,
    }
  } else {
    const newLine = content && !content.endsWith('\n') ? '\n' : ''
    return {
      content: `${content}${newLine}${key}=${value}\n`,
      updated: false,
    }
  }
}

/**
 * Updates or adds multiple environment variables
 */
const updateEnvVars = (
  content: string,
  vars: Record<string, string>
): { content: string; newVars: string[]; updatedVars: string[] } => {
  let newContent = content
  const newVars: string[] = []
  const updatedVars: string[] = []

  for (const [key, value] of Object.entries(vars)) {
    const result = updateEnvVar(newContent, key, value)
    newContent = result.content
    if (result.updated) {
      updatedVars.push(key)
    } else {
      newVars.push(key)
    }
  }

  return { content: newContent, newVars, updatedVars }
}

/**
 * Finds config.toml in root or supabase directory
 */
const findConfigToml = (cwd: string): string | null => {
  const rootPath = join(cwd, 'config.toml')
  const supabasePath = join(cwd, 'supabase', 'config.toml')

  if (existsSync(supabasePath)) {
    return supabasePath
  }
  if (existsSync(rootPath)) {
    return rootPath
  }
  return null
}

/**
 * Updates or adds [auth.email.smtp] section in config.toml
 */
const updateConfigToml = (
  content: string,
  smtpConfig: {
    host: string
    port: number
    user: string
    password: string
    adminEmail: string
    senderName: string
  }
): { content: string; action: 'update' | 'append' } => {
  const smtpSectionRegex =
    /^\[auth\.email\.smtp\](?:\r?\n(?:[^\r\n]*(?:\r?\n|$))*?)(?=\[|$)/m

  const smtpSection = `[auth.email.smtp]
enabled = true
host = "env(SMTP_HOST)"
port = "env(SMTP_PORT)"
user = "env(SMTP_USER)"
pass = "env(SMTP_PASSWORD)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"`

  // Check if section exists
  if (smtpSectionRegex.test(content)) {
    // Update existing section - preserve comments and other content after the section
    return {
      content: content.replace(smtpSectionRegex, (match, offset, fullContent) => {
        // Extract any content after the section properties (comments, etc.)
        // The match includes the header and properties, find what comes after our known properties
        const lines = match.split(/\r?\n/)
        const knownProperties = [
          'enabled',
          'host',
          'port',
          'user',
          'pass',
          'admin_email',
          'sender_name',
        ]

        // Find the last line that contains a known property
        let lastPropertyIndex = 0 // Header is at index 0
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          // Check if this line is a known property
          const isKnownProperty = knownProperties.some(
            (prop) =>
              line.startsWith(prop + ' =') || line.startsWith(prop + '=')
          )
          if (isKnownProperty) {
            lastPropertyIndex = i
          } else if (line.startsWith('[')) {
            // Next section starts, stop here (shouldn't happen in match, but safety check)
            break
          }
        }

        // Get any content after the last property (comments, blank lines, etc.)
        // Preserve the exact content including newlines
        const preservedContent = lines.slice(lastPropertyIndex + 1).join('\n')

        // Check what comes after the match in the original content
        const afterMatch = fullContent.slice(offset + match.length)
        const trimmedAfter = afterMatch.trimStart()
        const hasNextSection = trimmedAfter.startsWith('[')
        
        // Build replacement: blank line before, new section, blank line after last property, then preserved content
        if (preservedContent.trim()) {
          // Blank line right after sender_name, then preserved content (comments)
          // If there's a next section, ensure we preserve the newline(s) before it
          if (hasNextSection) {
            // Count how many newlines were before the next section
            const newlinesBeforeNext = afterMatch.length - trimmedAfter.length
            // Ensure at least one newline before next section (preserve original spacing)
            const spacingBeforeNext = newlinesBeforeNext > 0 ? '\n'.repeat(newlinesBeforeNext) : '\n'
            return '\n' + smtpSection + '\n\n' + preservedContent + spacingBeforeNext
          }
          return '\n' + smtpSection + '\n\n' + preservedContent
        } else {
          // No preserved content, but check if there's a next section
          if (hasNextSection) {
            const newlinesBeforeNext = afterMatch.length - trimmedAfter.length
            const spacingBeforeNext = newlinesBeforeNext > 0 ? '\n'.repeat(newlinesBeforeNext) : '\n'
            return '\n' + smtpSection + '\n\n' + spacingBeforeNext
          }
          return '\n' + smtpSection + '\n\n'
        }
      }),
      action: 'update',
    }
  }

  // Check if [auth] section exists
  const authSectionRegex = /^\[auth\]/m
  if (authSectionRegex.test(content)) {
    // Find the end of [auth] section - match [auth] and all lines until next [ or end of file
    // Lines that belong to [auth] are those that don't start with [
    const lines = content.split(/\r?\n/)
    let authStartIndex = -1
    let authEndIndex = lines.length

    // Find where [auth] section starts
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '[auth]') {
        authStartIndex = i
        break
      }
    }

    if (authStartIndex !== -1) {
      // Find where [auth] section ends (next line starting with [ or end of file)
      for (let i = authStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        // If line starts with [ (and is not empty), it's a new section
        if (line.startsWith('[') && line.length > 1) {
          authEndIndex = i
          break
        }
      }

      // Insert the new section after the [auth] section
      const beforeLines = lines.slice(0, authEndIndex)
      const afterLines = lines.slice(authEndIndex)

      // Reconstruct content with new section inserted
      const before = beforeLines.join('\n')
      const after = afterLines.join('\n')

      // Add newline after before section if it doesn't end with one
      const beforeWithNewline =
        before && !before.endsWith('\n') ? `${before}\n` : before
      // Add newline before after section if there is content after
      const afterWithNewline = after ? `\n${after}` : ''

      return {
        content: `${beforeWithNewline}\n${smtpSection}\n${afterWithNewline}`,
        action: 'append',
      }
    }
  }

  // Append at the end
  const separator = content && !content.endsWith('\n') ? '\n\n' : '\n'
  return {
    content: `${content}${separator}${smtpSection}\n`,
    action: 'append',
  }
}

/**
 * Analyzes what changes need to be made
 */
const analyzeChanges = (
  cwd: string,
  config: InitConfig,
  baseUrl: string
): ProposedChanges => {
  const changes: ProposedChanges = {}

  // Check environment file
  const envLocalPath = join(cwd, '.env.local')
  const envPath = join(cwd, '.env')
  const envTargetPath = existsSync(envLocalPath) ? envLocalPath : envPath

  if (existsSync(envTargetPath)) {
    const content = readFileSync(envTargetPath, 'utf-8')
    const apiKey = getOrGenerateApiKey(content)
    const envVars = {
      RESEND_API_KEY: apiKey,
      RESEND_BASE_URL: baseUrl,
      SMTP_HOST: config.smtpHost,
      SMTP_PORT: config.smtpPort.toString(),
      SMTP_USER: 'admin',
      SMTP_PASSWORD: 'admin',
      SMTP_ADMIN_EMAIL: '"no-reply@sandbox.local"',
      SMTP_SENDER_NAME: '"Sandbox"',
    }

    const result = updateEnvVars(content, envVars)
    if (result.newVars.length > 0 || result.updatedVars.length > 0) {
      changes.envFile = {
        path: envTargetPath,
        newVars: result.newVars,
        updatedVars: result.updatedVars,
      }
    }
  } else {
    // File doesn't exist, will create it
    const apiKey = getOrGenerateApiKey('')
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
    }
  }

  // Check config.toml
  const configTomlPath = findConfigToml(cwd)
  if (configTomlPath) {
    const content = readFileSync(configTomlPath, 'utf-8')
    const smtpSectionRegex =
      /^\[auth\.email\.smtp\](?:\r?\n(?:[^\r\n]*(?:\r?\n|$))*?)(?=\[|$)/m

    if (!smtpSectionRegex.test(content)) {
      // Section doesn't exist, will add it
      changes.configToml = {
        path: configTomlPath,
        action: 'append',
      }
    } else {
      // Section exists, will update it
      changes.configToml = {
        path: configTomlPath,
        action: 'update',
      }
    }
  }

  return changes
}

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
    let content = ''
    if (existsSync(changes.envFile.path)) {
      content = readFileSync(changes.envFile.path, 'utf-8')
    }
    const apiKey = getOrGenerateApiKey(content)

    const envVars = {
      RESEND_API_KEY: apiKey,
      RESEND_BASE_URL: baseUrl,
      SMTP_HOST: config.smtpHost,
      SMTP_PORT: config.smtpPort.toString(),
      SMTP_USER: 'admin',
      SMTP_PASSWORD: 'admin',
      SMTP_ADMIN_EMAIL: '"no-reply@sandbox.local"',
      SMTP_SENDER_NAME: '"Sandbox"',
    }

    const result = updateEnvVars(content, envVars)
    writeFileSync(changes.envFile.path, result.content, 'utf-8')

    const newCount = changes.envFile.newVars.length
    const updatedCount = changes.envFile.updatedVars.length
    if (newCount > 0 && updatedCount > 0) {
      console.log(
        `✅ Updated ${changes.envFile.path} (${newCount} new, ${updatedCount} updated)`
      )
    } else if (newCount > 0) {
      console.log(`✅ Added ${newCount} variables to ${changes.envFile.path}`)
    } else {
      console.log(
        `✅ Updated ${updatedCount} variables in ${changes.envFile.path}`
      )
    }
  }

  // Apply config.toml changes
  if (changes.configToml) {
    let content = ''
    if (existsSync(changes.configToml.path)) {
      content = readFileSync(changes.configToml.path, 'utf-8')
    }

    const result = updateConfigToml(content, {
      host: config.smtpHost,
      port: config.smtpPort,
      user: 'admin',
      password: 'admin',
      adminEmail: 'no-reply@sandbox.local',
      senderName: 'Sandbox',
    })

    writeFileSync(changes.configToml.path, result.content, 'utf-8')

    if (result.action === 'update') {
      console.log(
        `✅ Updated [auth.email.smtp] section in ${changes.configToml.path}`
      )
    } else {
      console.log(
        `✅ Added [auth.email.smtp] section to ${changes.configToml.path}`
      )
    }
  }
}

/**
 * Shows summary of proposed changes
 */
const showSummary = (
  config: InitConfig,
  changes: ProposedChanges,
  baseUrl: string
): void => {
  console.log('\n📋 Configuration Summary\n')
  console.log(`HTTP Port: ${config.httpPort}`)
  console.log(`SMTP Port: ${config.smtpPort}`)
  console.log(`SMTP Host: ${config.smtpHost}`)
  console.log(`RESEND_BASE_URL: ${baseUrl}`)
  console.log('\n📝 Proposed Changes:\n')

  if (changes.envFile) {
    console.log(`Environment file: ${changes.envFile.path}`)
    if (changes.envFile.newVars.length > 0) {
      console.log(`  ➕ New variables: ${changes.envFile.newVars.join(', ')}`)
    }
    if (changes.envFile.updatedVars.length > 0) {
      console.log(
        `  🔄 Updated variables: ${changes.envFile.updatedVars.join(', ')}`
      )
    }
    console.log('')
  }

  if (changes.configToml) {
    console.log(`config.toml: ${changes.configToml.path}`)
    console.log(
      `  ${changes.configToml.action === 'update' ? '🔄 Update' : '➕ Add'} [auth.email.smtp] section`
    )
    console.log('')
  }

  if (!changes.envFile && !changes.configToml) {
    console.log('  ✓ No changes needed - everything is already configured!\n')
  }
}

/**
 * Initializes Resend Box configuration in the project
 */
export const initCommand = async (baseUrl?: string): Promise<void> => {
  const cwd = process.cwd()

  // Get ports from environment variables
  const ports = getPorts()
  const httpPort = ports.httpPort
  const smtpPort = ports.smtpPort

  // Detect if this is a Supabase project
  const isSupabaseProject = detectSupabaseProject(cwd)

  let finalBaseUrl: string
  let smtpHost: string
  let summaryShown = false

  // If baseUrl is provided, use it and don't ask questions
  if (baseUrl) {
    finalBaseUrl = baseUrl
    smtpHost = '127.0.0.1'
  } else if (isSupabaseProject) {
    // Show preview of what will be updated with Supabase-compatible settings
    const previewBaseUrl = `http://host.docker.internal:${httpPort}`
    const previewSmtpHost = 'host.docker.internal'
    const previewConfig: InitConfig = {
      httpPort,
      smtpPort,
      smtpHost: previewSmtpHost,
    }
    const previewChanges = analyzeChanges(cwd, previewConfig, previewBaseUrl)

    console.log('\n🔍 Supabase project detected!\n')
    showSummary(previewConfig, previewChanges, previewBaseUrl)
    summaryShown = true

    // Ask for Supabase-compatible configuration
    const useSupabaseConfig = await askConfirmation(
      'We have detected a Supabase project, do you want to set all env variables Supabase compatible?'
    )

    if (useSupabaseConfig) {
      finalBaseUrl = previewBaseUrl
      smtpHost = previewSmtpHost
    } else {
      finalBaseUrl = `http://127.0.0.1:${httpPort}`
      smtpHost = '127.0.0.1'
      // Show summary with localhost values since user chose not to use Supabase config
      const localConfig: InitConfig = {
        httpPort,
        smtpPort,
        smtpHost,
      }
      const localChanges = analyzeChanges(cwd, localConfig, finalBaseUrl)
      showSummary(localConfig, localChanges, finalBaseUrl)
      summaryShown = true
    }
  } else {
    // Not a Supabase project, use localhost without asking
    finalBaseUrl = `http://127.0.0.1:${httpPort}`
    smtpHost = '127.0.0.1'
  }

  const config: InitConfig = {
    httpPort,
    smtpPort,
    smtpHost,
  }

  // Analyze what changes need to be made
  const changes = analyzeChanges(cwd, config, finalBaseUrl)

  // Show summary if we haven't shown it yet
  if (!summaryShown) {
    showSummary(config, changes, finalBaseUrl)
  }

  // If no changes needed, exit early
  if (!changes.envFile && !changes.configToml) {
    console.log('💡 Your Resend SDK is already configured!')
    console.log('   Start the sandbox with: npx resend-box start\n')
    return
  }

  // Apply changes
  console.log('\n🔧 Applying changes...\n')
  applyChanges(cwd, config, changes, finalBaseUrl)

  console.log('\n💡 Your Resend SDK will now use the local sandbox!')
  console.log('   Start the sandbox with: npx resend-box start\n')
}
