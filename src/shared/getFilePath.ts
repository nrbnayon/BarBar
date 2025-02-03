// src/shared/getFilePath.ts
type IFolderName =
  | 'images'
  | 'salonDocument'
  | 'media'
  | 'doc'
  | 'medias'
  | 'docs'
  | 'image';

export const getFilePathMultiple = (
  files: any,
  fieldname: string,
  folderName: IFolderName
): string[] | undefined => {
  if (!files || !files[fieldname]) {
    return undefined;
  }

  return files[fieldname].map(
    (file: any) => `/${folderName}s/${file.filename}`
  );
};

const getFilePath = (files: any, folderName: IFolderName): string | null => {
  if (!files || !(folderName in files) || !files[folderName][0]) {
    return null;
  }

  const storageFolder = ['image', 'salonDocument', 'images'].includes(
    folderName
  )
    ? 'images'
    : `${folderName}s`;
  return `/${storageFolder}/${files[folderName][0].filename}`;
};

export default getFilePath;
