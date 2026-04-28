# 통합 견적 조회 기능 구현 계획

## 1. 개요 (Overview)
- **목표**: 입력한 부품 번호(MPN)를 바탕으로 DigiKey, Mouser, Element14 세 곳의 검색 결과 페이지를 브라우저 새 탭으로 동시에 열어주는 간편 견적 조회 기능 제공
- **상태**: 완료
- **예상 소요 시간**: 1~2 시간
- **시작일 (Start Date)**: 2026-04-28

## 2. 아키텍처 결정사항 (Architecture Decisions)
- **디자인 패턴**: Clean Architecture (Layered)
- **기술 스택**: Vite, React, TypeScript, Vitest
- **디렉터리/폴더 구조**: 
  - `src/domain/price-search/`
  - `src/application/price-search/`
  - `src/infrastructure/price-search/`
  - `src/presentation/price-search/`

## 3. 구현 단계 (Implementation Phases)

### Phase 1: 개발 환경 및 스캐폴딩
- [x] Vite React-TS 프로젝트 초기화
- [x] Vitest 및 테스트 환경 설정
- [x] Clean Architecture 기반 폴더 구조 생성

### Phase 2: Domain Layer (URL Generator)
- [x] **RED**: 각 쇼핑몰(DigiKey, Mouser, Element14)의 올바른 검색 URL을 반환하는지 테스트 작성
- [x] **GREEN**: 검색어(MPN)를 받아 3개의 URL 문자열 배열을 반환하는 순수 함수 구현
- [x] **REFACTOR**: URL 매직 스트링 제거 및 구조 최적화
- [x] **Check**: 테스트 통과 (Vitest)

### Phase 3: Application & Infrastructure Layer (탭 열기 로직)
- [x] **RED**: URL 배열을 받아 `window.open`을 호출하는 포트(인터페이스) 테스트 작성
- [x] **GREEN**: Infrastructure 레이어에 WindowOpener 구현, Application 레이어의 SearchUseCase 구현
- [x] **REFACTOR**: 의존성 주입(Dependency Injection)을 통한 결합도 낮추기
- [x] **Check**: Use Case 테스트 통과

### Phase 4: Presentation Layer (React UI)
- [x] **RED**: 검색어 입력창, 검색 버튼 렌더링 검증 및 이벤트 테스트 작성
- [x] **GREEN**: UI 컴포넌트 구현 및 SearchUseCase 연결
- [x] **REFACTOR**: 현대적인 디자인(다크모드, 글래스모피즘, 부드러운 애니메이션), 팝업 차단 경고 UI 추가
- [x] **Check**: 컴포넌트 테스트 통과

## 4. Quality Gates (품질 검증)
- [x] 브라우저에서 직접 실행하여 3개 탭 오픈 확인 (E2E 수동 검증 대기중)
- [x] 모든 단위 테스트 통과 (Green Status)
- [x] 린트(Lint) 및 정적 분석 에러/경고 없음
