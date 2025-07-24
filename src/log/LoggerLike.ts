export type LoggerLike = {
  info: (...message: any) => void;
  debug: (...message: any) => void;
  error: (...message: any) => void;
  warn: (...message: any) => void;
};
