# Orbit Rating

Rotaeno 레이팅·B40·대상곡·완성도 분석 웹 서비스. Artis+의 「Rotaeno 新时代 Rating 分析表」(2.27.0) 계산 규칙을 그대로 옮기고, 계정 동기화와 TapTap 클라우드 세이브 가져오기를 더했습니다.

| 화면 | 내용 |
| --- | --- |
| `/` | 레이팅, B40 궤도, 구간 평균, B40 진입 최저 정수, 완성도, 다음 +0.001 추천 5곡 |
| `/scores` | 1,746채보 점수·FC/AP 입력 (검색, 팩·난이도·정수 필터, 정렬) |
| `/best` | B40 목록, 구간별 이론치까지 남은 점수, 이미지 저장 |
| `/targets` | 채보별 +0.001 최소 점수, 목표 레이팅 도달 경로 |
| `/completion` | 완성도와 난이도 구간별 분석 |
| `/history` | 레이팅 기록 그래프 |
| `/tools` | 랜덤 곡, 랜덤 챌린지(多重随机), 정수 연대기 |
| `/ranking`, `/u/[handle]` | 공개 프로필 랭킹, 공개 프로필 |
| `/import` | TapTap 클라우드 세이브, 분석표 xlsx, JSON/CSV |
| `/settings`, `/admin` | 프로필·테마, 곡 데이터 갱신(관리자) |

## 계산 규칙과 검증

`src/lib/core`가 계산 엔진입니다. 2.27.0 분석표에 테스트 점수를 넣고 LibreOffice로 다시 계산한 결과와 비교합니다(`tests/fixtures`).

- 1,746채보의 단곡 레이팅·IV/IV-α 처리·순위, B40, 구간 통계, 완성도(총합·구간별)가 분석표와 같습니다.
- +0.001 목표 점수는 분석표의 구간 역산 대신 채보별 이진 탐색으로 구합니다. 그 점수에서 레이팅이 오르고, 1점 낮으면 오르지 않는 것을 테스트로 확인합니다. (분석표 방식은 100만 점 미만에서 1–5점 모자라게 나올 수 있습니다.)
- 이론치는 정수 연산으로 17.886입니다. 분석표 표기 17.885는 Excel 부동소수점 TRUNC 결과입니다.

```bash
npm test                                             # 엔진·대상곡 테스트
ROTAENO_SHEET=/path/to/filled-2.27.0.xlsx npm test   # xlsx 가져오기 테스트 포함
```

## 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL, publishable key
npm run dev
```

## Supabase 설정 (프로젝트 `orbit-rating`, 서울 리전)

스키마·RLS·곡 데이터(2.27.0)·Edge Function(`taptap-import`)은 이미 들어가 있습니다. 대시보드에서 아래만 하면 됩니다.

1. **OAuth 제공자**: Authentication → Sign In / Providers에서 Discord, Google을 켜고 각 개발자 콘솔에서 만든 Client ID·Secret을 넣습니다. 두 콘솔의 Redirect URI는 `https://ysezajjmchhwzzzcwckt.supabase.co/auth/v1/callback`입니다.
2. **리다이렉트 URL**: Authentication → URL Configuration에서 Site URL을 배포 주소로, Redirect URLs에 `http://localhost:3000/auth/callback`과 `https://<배포 주소>/auth/callback`을 추가합니다.
3. **TapTap 가져오기 시크릿**: Edge Functions → Secrets에 `TAPTAP_CLIENT_ID_GLOBAL`, `TAPTAP_CLIENT_ID_CN`, `ROTAENO_LC_KEY_GLOBAL`, `ROTAENO_LC_KEY_CN`을 넣습니다. 값이 없으면 가져오기 화면에서 "서버 설정이 끝나지 않았습니다"가 표시됩니다.
4. **정리 SQL**: `supabase/migrations/20261108000100_cleanup.sql`을 SQL 편집기에서 한 번 실행합니다(초기 적재용 함수 삭제, 관리자 정책 분리).
5. **관리자 지정**: 한 번 로그인한 뒤 SQL 편집기에서

   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '관리자 이메일';
   ```

   을 실행하고 다시 로그인하면 `/admin`이 열립니다. 새 버전 분석표 xlsx를 올리면 바뀐 정수·새 채보를 보여 준 뒤 모든 사용자에게 반영합니다.

## 데이터와 보안

- 점수·스냅샷·프로필은 본인만 읽고 씁니다. 프로필을 공개하면 다른 사람도 읽을 수 있습니다.
- 곡 데이터는 누구나 읽고, `app_metadata.role = 'admin'`인 계정만 씁니다(`user_metadata`는 쓰지 않음).
- TapTap 토큰과 게임 세션 토큰은 Edge Function 안에서 한 번 쓰고 저장하거나 로그에 남기지 않습니다. 세이브는 읽기만 합니다.
- 곡 데이터 출처: Rotaeno 新时代 Rating 分析表 (Artis+). 데이터·로직 사용은 작성자와 협의된 범위에서 사용합니다.

## 구조

```
src/lib/core        계산 엔진 (rating, completion, excel 반올림)
src/lib/targets.ts  대상곡·목표 경로
src/lib/sheet.ts    분석표 xlsx 읽기 (점수, 곡 마스터)
src/lib/data        Supabase 곡 데이터 로더
src/components      앱 상태(AppProvider), 셸, 궤도 차트, 공통 UI
supabase/           마이그레이션, Edge Function
scripts/extract_sheet.py  분석표 → src/data/*.json
```
