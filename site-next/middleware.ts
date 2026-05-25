import { NextRequest, NextResponse } from 'next/server';

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>공사중 · Profitsolo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <style>
    *{box-sizing:border-box}
    body{
      font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;
      background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);
      color:#1c1917;margin:0;min-height:100vh;
      display:flex;align-items:center;justify-content:center;padding:24px;
    }
    .card{
      max-width:440px;width:100%;padding:48px 32px;text-align:center;
      background:#ffffff;border-radius:24px;
      box-shadow:0 8px 32px rgba(146,64,14,0.12);
    }
    .icon{font-size:56px;margin-bottom:16px;line-height:1}
    h1{
      font-size:28px;margin:0 0 12px;color:#92400e;
      font-weight:800;letter-spacing:-0.5px;
    }
    p{font-size:15px;line-height:1.7;color:#57534e;margin:6px 0}
    .small{font-size:12px;color:#a8a29e;margin-top:24px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚧</div>
    <h1>공사중입니다</h1>
    <p>잠시 사이트를 정비하고 있어요.<br/>곧 다시 찾아뵐게요.</p>
    <p class="small">Profitsolo</p>
  </div>
</body>
</html>`;

export function middleware(_request: NextRequest) {
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Retry-After': '86400',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
