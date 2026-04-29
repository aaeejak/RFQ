import React, { useCallback, useState, useRef } from 'react';

interface Props {
  onFileSelected: (file: File) => void;
}

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

export default function FileUploadZone({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
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
            {ACCEPTED_TYPES.length > 0 && (
              <span className="upload-zone__badge-group">
                <span className="format-badge">.xlsx</span>
                <span className="format-badge">.xls</span>
                <span className="format-badge">.csv</span>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
