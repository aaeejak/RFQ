import React, { useCallback, useState, useRef } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
}

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';

export default function FileUploadZone({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      console.log('[FileUploadZone] 파일 선택됨:', file.name, file.size, 'bytes', file.type);
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // input 초기화 (같은 파일 재선택 가능하도록)
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [handleFile]
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    // input 자체 클릭인 경우 무시 (이벤트 버블링 방지)
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    inputRef.current?.click();
  }, []);

  return (
    <div
      className={`upload-zone ${isDragging ? 'upload-zone--dragging' : ''} ${fileName ? 'upload-zone--loaded' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="파일 업로드"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="upload-zone__input"
        data-testid="file-input"
        onClick={(e) => e.stopPropagation()}
      />

      {fileName ? (
        <div className="upload-zone__loaded">
          <span className="upload-zone__icon">✅</span>
          <p className="upload-zone__filename">{fileName}</p>
          <p className="upload-zone__hint">다른 파일을 선택하려면 클릭하세요</p>
        </div>
      ) : (
        <div className="upload-zone__empty">
          <span className="upload-zone__icon">📂</span>
          <p className="upload-zone__text">
            파일을 여기에 드래그하거나 <strong>클릭</strong>하세요
          </p>
          <p className="upload-zone__formats">
            <span className="upload-zone__badge-group">
              <span className="format-badge">.xlsx</span>
              <span className="format-badge">.xls</span>
              <span className="format-badge">.csv</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
