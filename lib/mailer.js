/**
 * Outbound email via the operator's own SMTP server.
 *
 * Dependency-free SMTP client (node:net / node:tls) so the app needs no
 * extra packages. Configuration comes from the environment:
 *
 *   SMTP_HOST     e.g. smtp.example.com          (required)
 *   SMTP_PORT     default 587 (465 when SMTP_SECURE=true)
 *   SMTP_SECURE   "true" = implicit TLS (port 465 style); otherwise the
 *                 connection starts plain and upgrades via STARTTLS when
 *                 the server offers it.
 *   SMTP_USER     login user (optional if the server allows relay)
 *   SMTP_PASS     login password
 *   SMTP_FROM     envelope + header From address (default: SMTP_USER)
 *   SMTP_FROM_NAME  display name (default: "XC Media Pass")
 *
 * When SMTP_HOST is not set the mailer is "not configured": callers must
 * surface that honestly instead of pretending mail was sent.
 */

import net from 'node:net';
import tls from 'node:tls';

const TIMEOUT_MS = 20000;

export function mailerConfigured() {
  return Boolean(String(process.env.SMTP_HOST || '').trim());
}

function smtpConfig() {
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number.parseInt(process.env.SMTP_PORT, 10) || (secure ? 465 : 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');
  const from = String(process.env.SMTP_FROM || '').trim() || user;
  const fromName = String(process.env.SMTP_FROM_NAME || 'XC Media Pass').trim();
  return { host, port, secure, user, pass, from, fromName };
}

/** Minimal SMTP session: multiline-reply aware, STARTTLS + AUTH PLAIN/LOGIN. */
class SmtpSession {
  constructor(socket) {
    this.socket = socket;
    this.buffer = '';
    this.waiters = [];
    socket.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      this.pump();
    });
    socket.on('error', (err) => this.failAll(err));
    socket.on('close', () => this.failAll(new Error('SMTP connection closed')));
  }

  failAll(err) {
    const waiters = this.waiters.splice(0);
    for (const w of waiters) w.reject(err);
  }

  pump() {
    // A reply is complete when a line matches "<code> " (or bare "<code>").
    const lines = this.buffer.split('\r\n');
    // Keep the trailing partial line in the buffer.
    this.buffer = lines.pop() ?? '';
    for (const line of lines) {
      this.line = (this.line || '') + line + '\r\n';
      if (/^\d{3}[ -]/.test(line) && line[3] === ' ') {
        const full = this.line;
        this.line = '';
        const w = this.waiters.shift();
        if (w) w.resolve(full);
      } else if (/^\d{3}$/.test(line)) {
        const full = this.line || line;
        this.line = '';
        const w = this.waiters.shift();
        if (w) w.resolve(full);
      }
    }
  }

  readReply() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('SMTP reply timed out')), TIMEOUT_MS);
      this.waiters.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.pump();
    });
  }

  async command(line, ...expectCodes) {
    this.socket.write(line + '\r\n');
    const reply = await this.readReply();
    const code = Number.parseInt(reply.slice(0, 3), 10);
    if (expectCodes.length && !expectCodes.includes(code)) {
      throw new Error(`SMTP command failed (${line.split(' ')[0]}): ${reply.trim()}`);
    }
    return reply;
  }

  async ehlo() {
    const reply = await this.command('EHLO localhost', 250);
    const caps = new Set();
    for (const m of reply.matchAll(/250[ -]([A-Z0-9]+)/g)) caps.add(m[1]);
    // AUTH mechanisms appear as "250-AUTH LOGIN PLAIN".
    const authMatch = reply.match(/250[ -]AUTH ([A-Z ]+)/);
    return { caps, auth: authMatch ? authMatch[1].split(/\s+/) : [] };
  }
}

function connectSocket({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SMTP connection timed out')), TIMEOUT_MS);
    const onError = (err) => { clearTimeout(timer); reject(err); };
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => { clearTimeout(timer); resolve(socket); })
      : net.connect({ host, port }, () => { clearTimeout(timer); resolve(socket); });
    socket.once('error', onError);
  });
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('STARTTLS timed out')), TIMEOUT_MS);
    const secureSocket = tls.connect({ socket, servername: host }, () => {
      clearTimeout(timer);
      resolve(secureSocket);
    });
    secureSocket.once('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildMessage(cfg, { to, subject, html, text }) {
  const boundary = `xcmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const plain = text || htmlToText(html);
  const headers = [
    `From: ${cfg.fromName ? `"${cfg.fromName.replace(/"/g, '')}" <${cfg.from}>` : cfg.from}`,
    `To: ${to}`,
    `Subject: ${String(subject || '').replace(/[\r\n]+/g, ' ')}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${boundary}@xcmp.local>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    plain,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html || `<p>${plain.replace(/\n/g, '<br>')}</p>`,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return headers.join('\r\n') + '\r\n\r\n' + body;
}

/**
 * Send one message. Resolves { ok: true } on a 250 after DATA.
 * Throws with a descriptive message on any failure (including
 * "not configured") so callers can surface it honestly.
 */
export async function sendMail({ to, subject, body, text } = {}) {
  const cfg = smtpConfig();
  if (!cfg.host) {
    throw new Error('Email sending is not configured on this server (SMTP_HOST is not set).');
  }
  if (!cfg.from) {
    throw new Error('Email sending is not configured on this server (SMTP_FROM/SMTP_USER is not set).');
  }
  if (!to || !String(to).includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  let socket = await connectSocket(cfg);
  let session = new SmtpSession(socket);
  try {
    await session.readReply(); // greeting (220)
    let { caps, auth } = await session.ehlo();

    if (!cfg.secure && caps.has('STARTTLS')) {
      await session.command('STARTTLS', 220);
      socket = await upgradeToTls(socket, cfg.host);
      session = new SmtpSession(socket);
      ({ caps, auth } = await session.ehlo());
    }

    if (cfg.user) {
      if (auth.includes('PLAIN')) {
        const token = Buffer.from(`\0${cfg.user}\0${cfg.pass}`, 'utf8').toString('base64');
        await session.command(`AUTH PLAIN ${token}`, 235);
      } else if (auth.includes('LOGIN')) {
        await session.command('AUTH LOGIN', 334);
        await session.command(Buffer.from(cfg.user, 'utf8').toString('base64'), 334);
        await session.command(Buffer.from(cfg.pass, 'utf8').toString('base64'), 235);
      } else {
        throw new Error('SMTP server does not offer a supported AUTH mechanism (PLAIN or LOGIN).');
      }
    }

    await session.command(`MAIL FROM:<${cfg.from}>`, 250);
    await session.command(`RCPT TO:<${to}>`, 250, 251);
    await session.command('DATA', 354);
    const message = buildMessage(cfg, { to, subject, html: body, text });
    const stuffed = message.replace(/\r\n\./g, '\r\n..');
    await session.command(stuffed + '\r\n.', 250);
    try { await session.command('QUIT', 221); } catch { /* already done */ }
    return { ok: true };
  } finally {
    try { socket.destroy(); } catch { /* ignore */ }
  }
}
