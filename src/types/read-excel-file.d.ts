declare module 'read-excel-file' {
  const readXlsxFile: (file: File | ArrayBuffer) => Promise<any[][]>;
  export default readXlsxFile;
}
