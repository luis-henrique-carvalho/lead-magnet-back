export enum AutomationErrorType {
  Timeout = 'timeout',
  UpstreamError = 'upstream_error',
  ValidationError = 'validation_error',
  InternalError = 'internal_error',
  AuthError = 'auth_error',
  Throttling = 'throttling',
  SessionInvalid = 'session_invalid',
  LayoutChanged = 'layout_changed',
  CaptchaRequired = 'captcha_required',
  ManualRequired = 'manual_required',
}
