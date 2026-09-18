import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_FILE = path.join(__dirname, 'config.json')

// ANSI styling for readable terminal logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function log(tag, msg, color = colors.reset) {
  const time = new Date().toLocaleTimeString()
  console.log(`${colors.gray}[${time}]${colors.reset} ${color}${colors.bright}[${tag}]${colors.reset} ${msg}`)
}

// Load configuration
if (!fs.existsSync(CONFIG_FILE)) {
  console.error(`${colors.red}Missing config.json! Please create scripts/wbox-agent/config.json${colors.reset}`)
  process.exit(1)
}

let config = {}
try {
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
} catch (err) {
  console.error(`${colors.red}Failed to parse config.json: ${err.message}${colors.reset}`)
  process.exit(1)
}

const SERVER_URL = (config.server_url || 'http://localhost:8000').replace(/\/+$/, '')
const AGENT_TOKEN = config.agent_token || ''
const REQUEST_PATH = config.request_path || 'C:\\Restrnt\\3rdParty\\Request'
const RESPONSE_PATH = config.response_path || 'C:\\Restrnt\\3rdParty\\Response'
const POLL_INTERVAL_MS = (config.poll_interval_seconds || 2) * 1000
const HEARTBEAT_INTERVAL_MS = (config.heartbeat_interval_seconds || 15) * 1000

if (!AGENT_TOKEN) {
  console.error(`${colors.red}Missing agent_token in config.json! Please obtain your Agent Token from the Admin Settings.${colors.reset}`)
  process.exit(1)
}

console.log(`${colors.cyan}${colors.bright}`)
console.log('========================================================')
console.log('       WBOX IN-STORE SYNC AGENT (Cloud Bridge)          ')
console.log('========================================================')
console.log(`${colors.reset}`)
console.log(`Cloud Server:    ${SERVER_URL}`)
console.log(`Local Request:   ${REQUEST_PATH}`)
console.log(`Local Response:  ${RESPONSE_PATH}`)
console.log(`POS Machine:     ${os.hostname()}`)
console.log('--------------------------------------------------------')

function checkFolders() {
  let requestOk = false
  let responseOk = false

  try {
    if (fs.existsSync(REQUEST_PATH)) {
      // Test write permission
      const testFile = path.join(REQUEST_PATH, `.agent-test-${Date.now()}.tmp`)
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
      requestOk = true
    }
  } catch {
    requestOk = false
  }

  try {
    if (RESPONSE_PATH && fs.existsSync(RESPONSE_PATH)) {
      fs.readdirSync(RESPONSE_PATH)
      responseOk = true
    } else if (!RESPONSE_PATH) {
      // Response folder is optional in one-way POS dispatch
      responseOk = true
    } else {
      responseOk = false
    }
  } catch {
    responseOk = false
  }

  return { requestOk, responseOk }
}

let lastResponseHash = null

async function sendHeartbeat() {
  const { requestOk, responseOk } = checkFolders()

  try {
    const res = await fetch(`${SERVER_URL}/api/v1/wbox/agent/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wbox-Agent-Token': AGENT_TOKEN,
      },
      body: JSON.stringify({
        hostname: os.hostname(),
        request_path: REQUEST_PATH,
        request_ok: requestOk,
        response_path: RESPONSE_PATH || null,
        response_ok: responseOk,
        version: '1.0.0',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      log('HEARTBEAT ERROR', `Server responded with HTTP ${res.status}: ${err}`, colors.red)
      return
    }

    const data = await res.json()
    const folderStatus = requestOk ? `${colors.green}✓ Request Folder Ready${colors.reset}` : `${colors.red}✕ Request Folder Inaccessible${colors.reset}`
    log('HEARTBEAT', `❤️ Cloud connected · ${folderStatus} · Queue: ${data.pending_orders ?? 0} order(s)`, colors.cyan)
  } catch (err) {
    log('HEARTBEAT OFFLINE', `Cannot connect to ${SERVER_URL}: ${err.message}`, colors.yellow)
  }
}

async function pollOrders() {
  try {
    const res = await fetch(`${SERVER_URL}/api/v1/wbox/agent/poll`, {
      headers: {
        'X-Wbox-Agent-Token': AGENT_TOKEN,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        log('AUTH ERROR', 'Invalid WBOX Agent Token! Check config.json.', colors.red)
      }
      return
    }

    const data = await res.json()
    if (!data.export) {
      return
    }

    const exp = data.export
    log('ORDER', `📥 Received Order #${exp.order_id} (${exp.order_number}) for POS`, colors.green)

    // Ensure Request folder exists
    if (!fs.existsSync(REQUEST_PATH)) {
      log('ERROR', `Request folder does not exist: ${REQUEST_PATH}`, colors.red)
      return
    }

    const targetReqFile = path.join(REQUEST_PATH, exp.filename)
    const targetSigFile = path.join(REQUEST_PATH, exp.signal_filename)
    const tempReqFile = targetReqFile + '.tmp-' + Math.random().toString(36).slice(2, 8)

    // 1. Write XML atomically
    fs.writeFileSync(tempReqFile, exp.xml, 'utf-8')
    fs.renameSync(tempReqFile, targetReqFile)

    // 2. Write signal file
    fs.writeFileSync(targetSigFile, '', 'utf-8')

    log('POS WRITE', `✓ Written ${exp.filename} and ${exp.signal_filename} to Request folder`, colors.green)

    // 3. Acknowledge write to server
    const ackRes = await fetch(`${SERVER_URL}/api/v1/wbox/agent/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wbox-Agent-Token': AGENT_TOKEN,
      },
      body: JSON.stringify({ export_id: exp.id }),
    })

    if (ackRes.ok) {
      log('ACK', `✓ Order #${exp.order_id} marked as dispatched to POS`, colors.green)
    }
  } catch (err) {
    log('POLL ERROR', err.message, colors.yellow)
  }
}

async function checkResponses() {
  if (!fs.existsSync(RESPONSE_PATH)) return

  try {
    const files = fs.readdirSync(RESPONSE_PATH)
    // Common WBOX response file names: response.json, *.ans, *.res
    const targetFile = files.find(f => f.toLowerCase() === 'response.json' || f.endsWith('.ans') || f.endsWith('.res'))
    if (!targetFile) return

    const fullPath = path.join(RESPONSE_PATH, targetFile)
    const stat = fs.statSync(fullPath)
    // Only check files modified within the last 5 minutes
    if (Date.now() - stat.mtimeMs > 5 * 60 * 1000) return

    const content = fs.readFileSync(fullPath, 'utf-8')
    if (content === lastResponseHash) return

    lastResponseHash = content
    log('POS RESPONSE', `Found response file: ${targetFile}`, colors.cyan)

    let isSuccess = true
    let msg = 'POS response processed'
    try {
      const parsed = JSON.parse(content)
      if (parsed.status === 'error' || parsed.success === false) {
        isSuccess = false
        msg = parsed.message || 'POS error response'
      }
    } catch {
      // Plain text response
    }

    const res = await fetch(`${SERVER_URL}/api/v1/wbox/agent/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wbox-Agent-Token': AGENT_TOKEN,
      },
      body: JSON.stringify({
        response_content: content,
        is_success: isSuccess,
        message: msg,
      }),
    })

    if (res.ok) {
      log('POS RESPONSE', `✓ Uploaded POS response to cloud server`, colors.green)
    }
  } catch (err) {
    log('RESPONSE WATCH ERROR', err.message, colors.yellow)
  }
}

// Start timers
sendHeartbeat()
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
setInterval(pollOrders, POLL_INTERVAL_MS)
setInterval(checkResponses, 3000)

log('AGENT READY', 'Monitoring queued orders and POS responses. Press Ctrl+C to stop.', colors.green)
