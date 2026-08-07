# CarbonReply 자동 테스트

## 매 변경 시 실행

```powershell
npm run lint
npm run test
npm run build
```

`npm run test`는 12개월 자료, 미확정 월, 다른 연도 고지서, 이상 사용량의 수동 확정, 배출계수·배출량 계산을 검증합니다.

## 배포 환경 점검

별도 테스트 회사와 이미 확정된 12개월 프로젝트를 하나 준비한 뒤 아래 값을 로컬 환경 변수 또는 CI 비밀값으로 추가합니다. 운영 회사나 실제 고객 계정은 사용하지 않습니다.

```text
E2E_BASE_URL=https://carbon-reply.vercel.app
E2E_COMPANY_NAME=CarbonReply 테스트 회사
E2E_PASSWORD=테스트_전용_비밀번호
E2E_PROJECT_ID=확정된_12개월_테스트_프로젝트_UUID
```

```powershell
npx playwright install chromium
npm run test:e2e
```

배포 환경 시나리오는 로그인, 확정 결과 표시, 12개월 스냅샷, 결과 PDF 응답, 확정 뒤 검토 화면 접근 차단을 확인합니다. 환경 변수가 없으면 외부 데이터에 접근하지 않고 건너뜁니다.
