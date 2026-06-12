import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';

type ManualAffiliateLinkCaptureErrorType =
  | AutomationErrorType.CaptchaRequired
  | AutomationErrorType.LayoutChanged
  | AutomationErrorType.ManualRequired
  | AutomationErrorType.SessionInvalid;

export class AffiliateLinkCaptureManualRequiredError extends Error {
  constructor(
    message: string,
    readonly errorType: ManualAffiliateLinkCaptureErrorType = AutomationErrorType.ManualRequired,
  ) {
    super(message);
    this.name = AffiliateLinkCaptureManualRequiredError.name;
  }
}
