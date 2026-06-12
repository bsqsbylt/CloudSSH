import { Env } from '../types';

export { SSHSessionDO } from './durable-object';

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CloudSSH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e0e0e0; min-height: 100vh; }
    #app { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    #auth-section { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
    .auth-header { text-align: center; margin-bottom: 2rem; }
    .auth-header h1 { font-size: 3rem; font-weight: 600; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .auth-header p { color: #8892b0; font-size: 1.1rem; margin-top: 0.5rem; }
    #connection-form { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    .form-group { margin-bottom: 1.5rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: #a8b2d1; font-size: 0.9rem; font-weight: 500; }
    .form-group input { width: 100%; padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e0e0e0; font-size: 1rem; transition: all 0.3s ease; }
    .form-group input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.3); }
    .form-group input::placeholder { color: #5a6a8a; }
    .btn-connect { width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .btn-connect:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(102,126,234,0.4); }
    #toolbar { display: none; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border-radius: 8px 8px 0 0; border: 1px solid rgba(255,255,255,0.1); border-bottom: none; }
    #connection-info { color: #a8b2d1; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
    #disconnect-btn { padding: 0.5rem 1rem; background: rgba(234,108,115,0.2); color: #ea6c73; border: 1px solid rgba(234,108,115,0.3); border-radius: 6px; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; }
    #disconnect-btn:hover { background: rgba(234,108,115,0.3); }
    #terminal-container { display: none; background: #0a0e14; border-radius: 0 0 8px 8px; border: 1px solid rgba(255,255,255,0.1); border-top: none; padding: 0.5rem; min-height: 500px; }
    .xterm { height: 500px; }
    @media (max-width: 768px) { #app { padding: 1rem; } .auth-header h1 { font-size: 2rem; } .xterm { height: 400px; } }
  </style>
</head>
<body>
  <div id="app">
    <div id="auth-section">
      <div class="auth-header">
        <h1>CloudSSH</h1>
        <p>纯 Cloudflare 驱动的 Web SSH 终端</p>
      </div>
      <div id="connection-form">
        <div class="form-group"><label>主机地址</label><input type="text" id="host" placeholder="192.168.1.100" required /></div>
        <div class="form-group"><label>端口</label><input type="number" id="port" value="22" min="1" max="65535" /></div>
        <div class="form-group"><label>用户名</label><input type="text" id="username" placeholder="root" required /></div>
        <div class="form-group"><label>密码</label><input type="password" id="password" required /></div>
        <button type="button" class="btn-connect" onclick="connect()">连接</button>
      </div>
    </div>
    <div id="toolbar"><span id="connection-info"></span><button id="disconnect-btn" onclick="disconnect()">断开连接</button></div>
    <div id="terminal-container"></div>
  </div>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.min.js"></script>
  <script>
    let term, ws;
    function connect() {
      const host = document.getElementById('host').value;
      const port = document.getElementById('port').value || '22';
      const user = document.getElementById('username').value;
      const pass = document.getElementById('password').value;
      if (!host || !user || !pass) { alert('请填写所有必填字段'); return; }
      document.getElementById('auth-section').style.display = 'none';
      document.getElementById('toolbar').style.display = 'flex';
      document.getElementById('terminal-container').style.display = 'block';
      document.getElementById('connection-info').textContent = user + '@' + host + ':' + port;
      term = new Terminal({ cursorBlink: true, fontSize: 14, fontFamily: '"JetBrains Mono", monospace', theme: { background: '#0a0e14', foreground: '#b3b1ad' } });
      const fitAddon = new FitAddon.FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon.WebLinksAddon());
      term.open(document.getElementById('terminal-container'));
      fitAddon.fit();
      window.addEventListener('resize', () => fitAddon.fit());
      term.writeln('\\x1b[1;33m正在连接 ' + user + '@' + host + ':' + port + '...\\x1b[0m');
      const wsUrl = 'wss://' + window.location.host + '/api/ssh?host=' + encodeURIComponent(host) + '&port=' + port + '&user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass);
      ws = new WebSocket(wsUrl);
      ws.onopen = () => term.writeln('\\x1b[32mWebSocket 已连接\\x1b[0m');
      ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try { const m = JSON.parse(e.data); if (m.type === 'status') term.writeln('\\x1b[32m[系统] ' + m.message + '\\x1b[0m'); else if (m.type === 'error') term.writeln('\\x1b[31m[错误] ' + m.message + '\\x1b[0m'); } catch { term.write(e.data); }
        } else {
          const r = new FileReader(); r.onload = () => term.write(new Uint8Array(r.result)); r.readAsArrayBuffer(e.data);
        }
      };
      ws.onclose = (e) => term.writeln('\\x1b[33m[连接关闭] code=' + e.code + '\\x1b[0m');
      ws.onerror = () => term.writeln('\\x1b[31m[连接错误]\\x1b[0m');
      term.onData((d) => { if (ws?.readyState === 1) ws.send(d); });
      term.onResize(({cols, rows}) => { if (ws?.readyState === 1) ws.send(JSON.stringify({type:'resize',cols,rows})); });
    }
    function disconnect() {
      ws?.close(); ws = null; term?.dispose();
      document.getElementById('auth-section').style.display = 'flex';
      document.getElementById('toolbar').style.display = 'none';
      document.getElementById('terminal-container').style.display = 'none';
    }
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/ssh') {
      return handleSSHConnection(request, env);
    }

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() });
    }

    return new Response(HTML, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  },
};

async function handleSSHConnection(request: Request, env: Env): Promise<Response> {
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return Response.json(
      { error: 'Expected WebSocket upgrade' },
      { status: 426 }
    );
  }

  const url = new URL(request.url);
  const host = url.searchParams.get('host');
  const port = parseInt(url.searchParams.get('port') || '22');
  const username = url.searchParams.get('user');
  const password = url.searchParams.get('pass');

  if (!host || !username || !password) {
    return Response.json(
      { error: 'Missing required parameters: host, user, pass' },
      { status: 400 }
    );
  }

  const doId = env.SSH_SESSION.idFromName(`ssh:${host}:${port}:${username}`);
  const stub = env.SSH_SESSION.get(doId);

  return stub.fetch(request);
}
