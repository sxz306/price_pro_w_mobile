// Gmail integration via Replit connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getSenderEmail(): Promise<string> {
  const gmail = await getUncachableGmailClient();
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data.emailAddress || 'noreply@pricepro.com';
}

export async function sendQuoteEmail(
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ messageId: string; threadId: string }> {
  const gmail = await getUncachableGmailClient();
  const senderEmail = await getSenderEmail();

  const rawMessage = [
    `From: Price Pro <${senderEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody,
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  return {
    messageId: result.data.id || '',
    threadId: result.data.threadId || '',
  };
}

export async function getThreadReplies(threadId: string): Promise<Array<{
  id: string;
  from: string;
  date: string;
  subject: string;
  snippet: string;
  body: string;
  isSender: boolean;
}>> {
  const gmail = await getUncachableGmailClient();
  const senderEmail = await getSenderEmail();

  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages = thread.data.messages || [];

  return messages.map((msg) => {
    const headers = msg.payload?.headers || [];
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';

    let body = '';
    if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
    } else if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
      const htmlPart = msg.payload.parts.find(p => p.mimeType === 'text/html');
      const part = textPart || htmlPart;
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }

    return {
      id: msg.id || '',
      from,
      date,
      subject,
      snippet: msg.snippet || '',
      body,
      isSender: from.includes(senderEmail),
    };
  });
}
