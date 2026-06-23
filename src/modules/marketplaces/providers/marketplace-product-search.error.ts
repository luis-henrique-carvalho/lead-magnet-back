import { AutomationErrorType } from '../../../shared/enums/automation-error-type.enum';

export class MarketplaceProductSearchError extends Error {
  constructor(
    message: string,
    readonly errorType: AutomationErrorType,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = MarketplaceProductSearchError.name;
  }
}
