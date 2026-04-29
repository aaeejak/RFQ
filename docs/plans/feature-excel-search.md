# 엑셀 파일 업로드 및 부품 검색 기능 구현 계획

## 1. 개요 (Overview)
- **목표**: 엑셀/CSV 파일을 업로드하여 부품 번호를 목록으로 표시하고, 클릭 시 DigiKey/Mouser/Element14 검색 탭을 동시에 여는 기능
- **상태**: 완료
- **예상 소요 시간**: 1~2 시간
- **시작일 (Start Date)**: 2026-04-29

## 2. 아키텍처 결정사항 (Architecture Decisions)
- **디자인 패턴**: Clean Architecture (Layered)
- **기술 스택**: Vite, React, TypeScript, Vitest, SheetJS (xlsx)
- **디렉터리/폴더 구조**:
  - `src/domain/excel-search/`
  - `src/application/excel-search/`
  - `src/infrastructure/excel-search/`
  - `src/presentation/excel-search/`

## 3. 구현 단계 (Implementation Phases)

### Phase 1: 의존성 설치
- [x] `xlsx` (SheetJS) 패키지 설치

### Phase 2: Domain Layer — ExcelPart 엔티티
- [x] **RED**: ExcelPart 생성/검증 테스트 작성 (빈 MPN, 음수 수량 등)
- [x] **GREEN**: createExcelPart 팩토리 함수 구현
- [x] **Check**: 6개 테스트 통과

### Phase 3: Application Layer — ParseExcelUseCase
- [x] **RED**: Mock IFileParser로 파싱/매핑 테스트 작성
- [x] **GREEN**: ParseExcelUseCase 구현 (parseFile + applyMapping)
- [x] **Check**: 6개 테스트 통과

### Phase 4: Infrastructure — SheetJsFileParser
- [x] SheetJS 기반 파서 구현 (.xlsx, .xls, .csv 지원)

### Phase 5–8: Presentation Layer
- [x] FileUploadZone (드래그 & 드롭 + 클릭 업로드)
- [x] ColumnSelector (열 선택 드롭다운 + 미리보기 테이블 + 자동 감지)
- [x] PartTable (부품 목록 + 실시간 필터 + 클릭 검색)
- [x] ExcelSearchPage (3단계 스테퍼 통합 페이지)
- [x] App.tsx 탭 네비게이션 ("수동 검색" / "엑셀 업로드")

### Phase 9: UI 폴리싱
- [x] 글래스모피즘, 다크모드, 스테퍼, 애니메이션, 반응형 레이아웃

## 4. Quality Gates (품질 검증)
- [x] 전체 24개 테스트 통과 (5 test files)
- [x] TypeScript 컴파일 에러 없음
- [x] 브라우저에서 UI 확인 완료
