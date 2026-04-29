import { useState, useMemo, useCallback } from 'react';
import type { ParsedSheet, ColumnMapping } from '../../application/excel-search/IFileParser';
import type { ExcelPart } from '../../domain/excel-search/ExcelPart';
import { ParseExcelUseCase } from '../../application/excel-search/ParseExcelUseCase';
import { SheetJsFileParser } from '../../infrastructure/excel-search/SheetJsFileParser';
import FileUploadZone from './FileUploadZone';
import ColumnSelector, { useAutoDetect } from './ColumnSelector';
import PartTable from './PartTable';

type Step = 'upload' | 'columns' | 'results';

interface Props {
  onSearch: (mpn: string) => void;
}

export default function ExcelSearchPage({ onSearch }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [parts, setParts] = useState<ExcelPart[]>([]);
  const [useFirstRowAsHeader, setUseFirstRowAsHeader] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping>({
    mpnColumnIndex: 0,
    quantityColumnIndex: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const useCase = useMemo(() => {
    const parser = new SheetJsFileParser();
    return new ParseExcelUseCase(parser);
  }, []);

  // 자동 감지: 첫 행이 헤더일 때만 작동
  const headerRow = sheet && useFirstRowAsHeader && sheet.rawRows.length > 0
    ? sheet.rawRows[0]
    : [];
  const autoMapping = useAutoDetect(headerRow);

  const handleFileSelected = useCallback(
    async (file: File) => {
      console.log('[ExcelSearchPage] handleFileSelected 호출:', file.name);
      setError(null);
      setIsLoading(true);
      try {
        const parsed = await useCase.parseFile(file);
        console.log('[ExcelSearchPage] 파싱 성공:', {
          rowCount: parsed.rawRows.length,
          columnCount: parsed.columnCount,
        });
        setSheet(parsed);

        // 자동 감지 시도
        if (parsed.rawRows.length > 0) {
          const firstRow = parsed.rawRows[0];
          // 첫 행이 헤더처럼 보이는지 자동 판별:
          // 숫자가 아닌 문자열이 50% 이상이면 헤더로 추정
          const nonNumericCount = firstRow.filter((cell) => {
            const trimmed = cell.trim();
            return trimmed !== '' && isNaN(Number(trimmed));
          }).length;
          const isLikelyHeader = nonNumericCount >= Math.ceil(firstRow.length * 0.5);
          setUseFirstRowAsHeader(isLikelyHeader);
        }

        setMapping({ mpnColumnIndex: 0, quantityColumnIndex: null });
        setStep('columns');
      } catch (err) {
        console.error('[ExcelSearchPage] 파싱 실패:', err);
        const message = err instanceof Error ? err.message : '파일 파싱 중 오류가 발생했습니다.';
        setError(`${message}\n\n(F12 → 콘솔에서 자세한 로그를 확인하세요)`);
      } finally {
        setIsLoading(false);
      }
    },
    [useCase]
  );

  // 헤더 토글 변경 시 자동 감지 재적용
  const handleToggleHeader = useCallback(
    (value: boolean) => {
      setUseFirstRowAsHeader(value);
      if (value && sheet && sheet.rawRows.length > 0) {
        // 헤더 켜면 자동 감지 시도
        setMapping(autoMapping);
      } else {
        setMapping({ mpnColumnIndex: 0, quantityColumnIndex: null });
      }
    },
    [sheet, autoMapping]
  );

  const handleConfirmColumns = useCallback(() => {
    if (!sheet) return;
    try {
      const dataRows = useFirstRowAsHeader ? sheet.rawRows.slice(1) : sheet.rawRows;
      const result = useCase.applyMapping(dataRows, sheet.columnCount, mapping);
      if (result.length === 0) {
        setError('유효한 부품 번호가 없습니다. 올바른 열을 선택했는지 확인해 주세요.');
        return;
      }
      setParts(result);
      setStep('results');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '열 매핑 오류');
    }
  }, [sheet, mapping, useCase, useFirstRowAsHeader]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setSheet(null);
    setParts([]);
    setError(null);
    setUseFirstRowAsHeader(true);
  }, []);

  const handleBackToColumns = useCallback(() => {
    setStep('columns');
    setParts([]);
  }, []);

  return (
    <div className="excel-search">
      {/* 스테퍼 */}
      <div className="stepper">
        <div className={`stepper__step ${step === 'upload' ? 'stepper__step--active' : ''} ${step !== 'upload' ? 'stepper__step--done' : ''}`}>
          <span className="stepper__number">{step === 'upload' ? '1' : '✓'}</span>
          <span className="stepper__label">파일 업로드</span>
        </div>
        <div className="stepper__line" />
        <div className={`stepper__step ${step === 'columns' ? 'stepper__step--active' : ''} ${step === 'results' ? 'stepper__step--done' : ''}`}>
          <span className="stepper__number">{step === 'results' ? '✓' : '2'}</span>
          <span className="stepper__label">열 선택</span>
        </div>
        <div className="stepper__line" />
        <div className={`stepper__step ${step === 'results' ? 'stepper__step--active' : ''}`}>
          <span className="stepper__number">3</span>
          <span className="stepper__label">결과</span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-box" role="alert">
          ❌ {error}
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="loading-box">
          <div className="spinner" />
          <p>파일을 분석하고 있습니다...</p>
        </div>
      )}

      {/* Step 1: 파일 업로드 */}
      {step === 'upload' && !isLoading && (
        <FileUploadZone onFileSelected={handleFileSelected} />
      )}

      {/* Step 2: 열 선택 */}
      {step === 'columns' && sheet && (
        <div className="columns-step">
          <ColumnSelector
            rawRows={sheet.rawRows}
            columnCount={sheet.columnCount}
            useFirstRowAsHeader={useFirstRowAsHeader}
            onToggleHeader={handleToggleHeader}
            mapping={mapping}
            onMappingChange={setMapping}
          />
          <div className="columns-step__actions">
            <button className="btn btn--secondary" onClick={handleReset}>
              ← 다시 업로드
            </button>
            <button className="btn btn--primary" onClick={handleConfirmColumns}>
              확인 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 결과 */}
      {step === 'results' && (
        <div className="results-step">
          <PartTable parts={parts} onPartClick={onSearch} />
          <div className="results-step__actions">
            <button className="btn btn--secondary" onClick={handleBackToColumns}>
              ← 열 재선택
            </button>
            <button className="btn btn--secondary" onClick={handleReset}>
              🔄 새 파일 업로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
