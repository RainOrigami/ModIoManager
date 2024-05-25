export interface ModFile {
  filesize: number;
  filehash: {
    md5: string;
  };
  filename: string;
  download: {
    binary_url: string;
  };
}
