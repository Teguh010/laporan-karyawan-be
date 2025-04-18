import { memoryStorage } from 'multer';

export const multerConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
      callback(null, true);
    } else {
      callback(new Error('Unsupported file type'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
