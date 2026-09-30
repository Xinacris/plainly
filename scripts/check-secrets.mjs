// Run before every commit: node scripts/check-secrets.mjs
//
// Reads secret values from the local, gitignored env files at run time (it holds
// none itself), then:
//  - fails if any full secret appears in a tracked file or in .agent-logs/ (which
//    is committed, and captures the session's messages);
//  - redacts, in .agent-logs/, any 4-character prefix of a password or key that
//    was echoed there by mistake.
// Values are never printed; only variable names and file paths are.
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const ENV_FILES = ['.env.local', '.env.test.local']
const SECRET_NAMES = /SECRET|TOKEN|PASSWORD|OIDC/

const secrets = []
for (const file of ENV_FILES) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || !SECRET_NAMES.test(m[1])) continue
    const value = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
    if (value.length >= 8) secrets.push({ name: m[1], value })
  }
}

const tracked = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(Boolean)
const logs = fs.existsSync('.agent-logs') ? fs.readdirSync('.agent-logs').map((f) => `.agent-logs/${f}`) : []
const files = [...new Set([...tracked, ...logs])].filter((f) => fs.existsSync(f) && fs.statSync(f).isFile() && fs.statSync(f).size < 5_000_000)

let leaks = 0
let redactions = 0
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  for (const { name, value } of secrets) {
    if (text.includes(value)) {
      console.error(`LEAK: full value of ${name} found in ${file}`)
      leaks++
    }
  }
  if (file.startsWith('.agent-logs/')) {
    let changed = false
    for (const { value } of secrets) {
      const prefix = value.slice(0, 4)
      // Only as a standalone token (quoted, or followed by an ellipsis), to avoid touching ordinary words.
      const pattern = new RegExp(`(["“'‘(\\s])${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(…|\\.\\.\\.|["”'’)])`, 'g')
      if (pattern.test(text)) {
        text = text.replace(pattern, '$1[redacted]$2')
        changed = true
        redactions++
      }
    }
    if (changed) fs.writeFileSync(file, text)
  }
}
console.log(`checked ${files.length} files against ${secrets.length} secrets; ${redactions} partial leak(s) redacted`)
if (leaks) {
  console.error(`${leaks} full secret(s) found: do not commit.`)
  process.exit(1)
}
