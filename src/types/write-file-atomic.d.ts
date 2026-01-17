declare module 'write-file-atomic' {
  import { WriteFileOptions } from 'fs';
  
  function writeFileAtomic(
    filename: string,
    data: string | Buffer | Uint8Array,
    options?: WriteFileOptions | string
  ): Promise<void>;
  
  export = writeFileAtomic;
}

