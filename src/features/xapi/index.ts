// Public API for the xAPI / Learning Record Store feature module
export { xapiService } from './api/xapiService'
export type {
  XAPIContext,
  XAPIObjectType,
  XAPIResult,
  XAPIStatement,
  XAPIVerb,
} from './types/index'
export { xapi } from './utils/xapiStatementBuilder'
