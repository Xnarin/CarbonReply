# 탄소길잡이 연결 안내

## 1. Supabase 프로젝트 만들기

1. Supabase Dashboard에서 새 프로젝트를 만든다.
2. `SQL Editor`에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 실행한다.
3. `Project Settings > API`에서 아래 두 값을 확인한다.
   - Project URL
   - Publishable key
4. 이 폴더에 `.env.local` 파일을 만들고 아래처럼 입력한다. 이 파일은 Git에 올라가지 않는다.

```env
NEXT_PUBLIC_SUPABASE_URL=프로젝트_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=Publishable_key
```

5. 개발 서버를 켠 뒤 `http://localhost:3000/api/health`를 연다. `{ "status": "ok" }`가 표시되면 연결이 완료된 것이다.

## 2. Vercel 배포

1. Vercel에서 새 프로젝트를 만들고 이 `web` 폴더를 배포 대상으로 지정한다.
2. `Settings > Environment Variables`에 Supabase 환경 변수 두 개를 추가한다.
3. Production 배포를 실행한다.
4. 배포 URL 뒤에 `/api/health`를 붙여 Supabase 연결 상태를 확인한다.

> `GEMINI_API_KEY`는 Gemini 기능을 구현하는 단계에서 Vercel 환경 변수에만 추가한다. `NEXT_PUBLIC_` 접두어를 붙이지 않는다.
